"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import {
  failResult,
  okResult,
  toActionError,
  type ActionResult,
} from "@/lib/admin/action-result";
import { writeAuditLog } from "@/lib/admin/audit";
import {
  REQUEUEABLE_STATUSES,
  RAW_QUEUE_STATUS,
} from "@/lib/admin/raw-articles";
import { requireAdminAction } from "@/lib/auth/session";
import { getClientEnvSoft } from "@/lib/env";
import type { DbRawArticleStatus } from "@/lib/database/types";
import { contentHash } from "@/lib/utils/hash";
import { createLogger } from "@/lib/utils/logger";
import { normalizeCanonicalUrl } from "@/lib/utils/url";

const logger = createLogger("admin.raw-article-actions");

const uuidSchema = z.string().uuid("Geçersiz ham haber kimliği");

const createRawArticleSchema = z.object({
  sourceId: z.string().uuid("Kaynak seçin"),
  originalTitle: z.string().trim().min(1, "Başlık gerekli").max(500),
  originalUrl: z
    .string()
    .trim()
    .max(2000)
    .refine(
      (value) => !value || /^https?:\/\//i.test(value),
      "URL http:// veya https:// ile başlamalı",
    ),
  originalExcerpt: z.string().trim().max(4000),
  originalAuthor: z.string().trim().max(200),
  rawContent: z.string().trim().max(200_000),
  originalImageUrl: z
    .string()
    .trim()
    .max(2000)
    .refine(
      (value) =>
        !value ||
        value.startsWith("/") ||
        /^https?:\/\//i.test(value),
      "Görsel URL geçerli olmalı",
    ),
  queueForProcessing: z.boolean(),
});

export type CreateRawArticleInput = z.infer<typeof createRawArticleSchema>;

type RawArticleRow = {
  id: string;
  status: DbRawArticleStatus;
  failure_count: number;
  last_error: string | null;
  processed_at: string | null;
  original_title: string;
  source_id: string;
};

function dbFail(action: string, reason: string): ActionResult<never> {
  logger.error("Ham haber işlemi başarısız", { action, reason });
  return failResult("İşlem tamamlanamadı. Lütfen tekrar deneyin.");
}

function snapshot(row: RawArticleRow): Record<string, unknown> {
  return {
    id: row.id,
    status: row.status,
    failure_count: row.failure_count,
    last_error: row.last_error,
    processed_at: row.processed_at,
    original_title: row.original_title,
    source_id: row.source_id,
  };
}

function revalidateRawPaths(id: string) {
  revalidatePath("/admin/raw-articles");
  revalidatePath(`/admin/raw-articles/${id}`);
  revalidatePath("/admin/articles");
}

async function fetchRaw(
  supabase: Awaited<ReturnType<typeof requireAdminAction>>["supabase"],
  id: string,
): Promise<{ article: RawArticleRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from("raw_articles")
    .select(
      "id, status, failure_count, last_error, processed_at, original_title, source_id",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) return { article: null, error: error.message };
  return { article: (data as RawArticleRow | null) ?? null, error: null };
}

export async function createRawArticle(
  input: CreateRawArticleInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = createRawArticleSchema.parse(input);
    const { user, supabase } = await requireAdminAction();

    const { data: source, error: sourceError } = await supabase
      .from("sources")
      .select("id, name")
      .eq("id", parsed.sourceId)
      .maybeSingle();

    if (sourceError) {
      return dbFail("create.source", sourceError.message);
    }
    if (!source) {
      return failResult("Seçilen kaynak bulunamadı", {
        sourceId: ["Seçilen kaynak bulunamadı"],
      });
    }

    const id = randomUUID();
    let originalUrl = parsed.originalUrl.trim();
    if (!originalUrl) {
      const siteUrl = getClientEnvSoft().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
      originalUrl = `${siteUrl}/manual/${id}`;
    }

    let canonicalUrl: string;
    try {
      canonicalUrl = normalizeCanonicalUrl(originalUrl);
    } catch {
      return failResult("Geçerli bir kaynak URL girin", {
        originalUrl: ["Geçerli bir kaynak URL girin"],
      });
    }

    const { data: urlConflict } = await supabase
      .from("raw_articles")
      .select("id")
      .eq("canonical_url", canonicalUrl)
      .maybeSingle();

    if (urlConflict) {
      return failResult("Bu URL ile kayıtlı bir ham haber zaten var", {
        originalUrl: ["Bu URL ile kayıtlı bir ham haber zaten var"],
      });
    }

    const hashSource =
      parsed.rawContent.trim() ||
      parsed.originalExcerpt.trim() ||
      parsed.originalTitle;
    const status: DbRawArticleStatus = parsed.queueForProcessing
      ? RAW_QUEUE_STATUS
      : "skipped";

    const { data, error } = await supabase
      .from("raw_articles")
      .insert({
        id,
        source_id: parsed.sourceId,
        external_id: `manual:${id}`,
        original_url: originalUrl,
        canonical_url: canonicalUrl,
        original_title: parsed.originalTitle,
        original_excerpt: parsed.originalExcerpt.trim() || null,
        original_author: parsed.originalAuthor.trim() || null,
        original_image_url: parsed.originalImageUrl.trim() || null,
        raw_content: parsed.rawContent.trim() || null,
        content_hash: contentHash(hashSource),
        status,
        raw_payload: {
          origin: "admin_manual",
          created_by: user.id,
        },
      })
      .select(
        "id, status, failure_count, last_error, processed_at, original_title, source_id",
      )
      .single();

    if (error || !data) {
      const code = (error as { code?: string } | null)?.code;
      if (code === "23505" || /duplicate|unique/i.test(error?.message ?? "")) {
        return failResult(
          "Bu ham haber zaten kayıtlı (yinelenen URL veya kimlik)",
        );
      }
      return dbFail("create", error?.message ?? "insert failed");
    }

    const row = data as RawArticleRow;

    await writeAuditLog(supabase, {
      actorId: user.id,
      action: "raw_article.create",
      entityType: "raw_article",
      entityId: row.id,
      beforeData: null,
      afterData: snapshot(row),
    });

    revalidateRawPaths(row.id);
    return okResult(
      { id: row.id },
      parsed.queueForProcessing
        ? "Ham haber oluşturuldu ve işlem kuyruğuna alındı"
        : "Ham haber oluşturuldu (kuyruğa alınmadı)",
    );
  } catch (error) {
    return toActionError(error);
  }
}

/**
 * AI ile yeniden işle: kuyruğa (pending) alır, last_error temizler.
 * failure_count artırılmaz; ilişkili haber silinmez.
 */
export async function reprocessRawArticle(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = uuidSchema.parse(id);
    const { user, supabase } = await requireAdminAction();
    const fetched = await fetchRaw(supabase, parsed);
    if (fetched.error) return dbFail("reprocess.fetch", fetched.error);
    const current = fetched.article;

    if (!current) {
      return failResult("Ham haber bulunamadı");
    }

    if (
      current.status === RAW_QUEUE_STATUS &&
      current.last_error === null
    ) {
      return okResult({ id: parsed }, "Ham haber zaten işlem kuyruğunda");
    }

    const { data, error } = await supabase
      .from("raw_articles")
      .update({
        status: RAW_QUEUE_STATUS,
        last_error: null,
        processed_at: null,
      })
      .eq("id", parsed)
      .select(
        "id, status, failure_count, last_error, processed_at, original_title, source_id",
      )
      .maybeSingle();

    if (error || !data) {
      return dbFail("reprocess", error?.message ?? "update failed");
    }

    await writeAuditLog(supabase, {
      actorId: user.id,
      action: "raw_article.reprocess",
      entityType: "raw_article",
      entityId: parsed,
      beforeData: snapshot(current),
      afterData: snapshot(data as RawArticleRow),
    });

    revalidateRawPaths(parsed);
    return okResult({ id: parsed }, "Ham haber yeniden işlem için kuyruğa alındı");
  } catch (error) {
    return toActionError(error);
  }
}

export async function rejectRawArticle(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = uuidSchema.parse(id);
    const { user, supabase } = await requireAdminAction();
    const fetched = await fetchRaw(supabase, parsed);
    if (fetched.error) return dbFail("reject.fetch", fetched.error);
    const current = fetched.article;

    if (!current) {
      return failResult("Ham haber bulunamadı");
    }

    if (current.status === "rejected") {
      return okResult({ id: parsed }, "Ham haber zaten reddedilmiş");
    }

    const { data, error } = await supabase
      .from("raw_articles")
      .update({ status: "rejected" satisfies DbRawArticleStatus })
      .eq("id", parsed)
      .select(
        "id, status, failure_count, last_error, processed_at, original_title, source_id",
      )
      .maybeSingle();

    if (error || !data) {
      return dbFail("reject", error?.message ?? "update failed");
    }

    await writeAuditLog(supabase, {
      actorId: user.id,
      action: "raw_article.reject",
      entityType: "raw_article",
      entityId: parsed,
      beforeData: snapshot(current),
      afterData: snapshot(data as RawArticleRow),
    });

    revalidateRawPaths(parsed);
    return okResult({ id: parsed }, "Ham haber reddedildi");
  } catch (error) {
    return toActionError(error);
  }
}

/**
 * Kuyruğa geri al: yalnızca failed / rejected / skipped.
 * Idempotent: zaten pending ise başarı döner.
 */
export async function requeueRawArticle(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = uuidSchema.parse(id);
    const { user, supabase } = await requireAdminAction();
    const fetched = await fetchRaw(supabase, parsed);
    if (fetched.error) return dbFail("requeue.fetch", fetched.error);
    const current = fetched.article;

    if (!current) {
      return failResult("Ham haber bulunamadı");
    }

    if (current.status === RAW_QUEUE_STATUS) {
      return okResult({ id: parsed }, "Ham haber zaten kuyrukta");
    }

    if (!REQUEUEABLE_STATUSES.includes(current.status)) {
      return failResult(
        "Bu durumdaki kayıt kuyruğa alınamaz. Yalnızca başarısız, reddedilmiş veya atlanmış kayıtlar uygun.",
      );
    }

    const { data, error } = await supabase
      .from("raw_articles")
      .update({
        status: RAW_QUEUE_STATUS,
        last_error: null,
      })
      .eq("id", parsed)
      .select(
        "id, status, failure_count, last_error, processed_at, original_title, source_id",
      )
      .maybeSingle();

    if (error || !data) {
      return dbFail("requeue", error?.message ?? "update failed");
    }

    await writeAuditLog(supabase, {
      actorId: user.id,
      action: "raw_article.requeue",
      entityType: "raw_article",
      entityId: parsed,
      beforeData: snapshot(current),
      afterData: snapshot(data as RawArticleRow),
    });

    revalidateRawPaths(parsed);
    return okResult({ id: parsed }, "Ham haber kuyruğa geri alındı");
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteRawArticle(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = uuidSchema.parse(id);
    const { user, supabase } = await requireAdminAction();
    const fetched = await fetchRaw(supabase, parsed);
    if (fetched.error) return dbFail("delete.fetch", fetched.error);
    const current = fetched.article;

    if (!current) {
      return okResult({ id: parsed }, "Ham haber zaten silinmiş");
    }

    const { data: linked, error: linkedError } = await supabase
      .from("articles")
      .select("id, title")
      .eq("raw_article_id", parsed)
      .maybeSingle();

    if (linkedError) {
      return dbFail("delete.linked", linkedError.message);
    }

    if (linked) {
      return failResult(
        "Bu ham habere bağlı oluşturulmuş bir haber var. Önce ilgili haberi silin veya bağlantısını kaldırın.",
      );
    }

    const { error } = await supabase
      .from("raw_articles")
      .delete()
      .eq("id", parsed);

    if (error) {
      return dbFail("delete", error.message);
    }

    await writeAuditLog(supabase, {
      actorId: user.id,
      action: "raw_article.delete",
      entityType: "raw_article",
      entityId: parsed,
      beforeData: snapshot(current),
      afterData: null,
    });

    revalidateRawPaths(parsed);
    return okResult({ id: parsed }, "Ham haber silindi");
  } catch (error) {
    return toActionError(error);
  }
}
