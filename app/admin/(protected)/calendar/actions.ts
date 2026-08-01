"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  failResult,
  okResult,
  toActionError,
  type ActionResult,
} from "@/lib/admin/action-result";
import { writeAuditLog } from "@/lib/admin/audit";
import { publishArticleNow } from "@/app/admin/(protected)/articles/actions";
import { requireAdminAction } from "@/lib/auth/session";
import type { DbArticle, DbArticleStatus } from "@/lib/database/types";
import { istanbulDatetimeLocalToUtcIso } from "@/lib/utils/date";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("admin.calendar-actions");

const uuidSchema = z.string().uuid("Geçersiz haber kimliği");

const SCHEDULABLE_STATUSES: ReadonlySet<DbArticleStatus> = new Set([
  "draft",
  "needs_review",
  "scheduled",
]);

const rescheduleSchema = z.object({
  id: uuidSchema,
  scheduledAtLocal: z
    .string()
    .min(1, "Planlanan tarih gerekli")
    .refine((value) => istanbulDatetimeLocalToUtcIso(value) !== null, {
      message: "Geçerli bir tarih ve saat girin",
    }),
});

function dbFail(action: string, reason: string): ActionResult<never> {
  logger.error("Takvim işlemi başarısız", { action, reason });
  return failResult("İşlem tamamlanamadı. Lütfen tekrar deneyin.");
}

function snapshotArticle(article: DbArticle): Record<string, unknown> {
  return {
    id: article.id,
    title: article.title,
    status: article.status,
    scheduled_at: article.scheduled_at,
    published_at: article.published_at,
  };
}

function revalidateCalendarPaths(id: string, slug?: string | null) {
  revalidatePath("/admin/calendar");
  revalidatePath("/admin/articles");
  revalidatePath(`/admin/articles/${id}`);
  revalidatePath(`/admin/articles/${id}/edit`);
  if (slug) {
    revalidatePath(`/haber/${slug}`);
    revalidatePath("/");
  }
}

async function fetchArticle(
  supabase: Awaited<ReturnType<typeof requireAdminAction>>["supabase"],
  id: string,
): Promise<{ article: DbArticle | null; error: string | null }> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return { article: null, error: error.message };
  }

  return { article: (data as DbArticle | null) ?? null, error: null };
}

export async function rescheduleCalendarArticle(input: {
  id: string;
  scheduledAtLocal: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = rescheduleSchema.parse(input);
    const utc = istanbulDatetimeLocalToUtcIso(parsed.scheduledAtLocal);
    if (!utc) {
      return failResult("Geçerli bir planlama tarihi girin");
    }
    if (new Date(utc).getTime() <= Date.now()) {
      return failResult("Planlanan tarih gelecekte olmalı");
    }

    const { user, supabase } = await requireAdminAction();
    const fetched = await fetchArticle(supabase, parsed.id);
    if (fetched.error) return dbFail("reschedule.fetch", fetched.error);
    const current = fetched.article;

    if (!current) {
      return failResult("Haber bulunamadı");
    }

    if (current.status === "published") {
      return failResult(
        "Yayınlanmış haber yeniden planlanamaz. Önce yayından kaldırın.",
      );
    }

    if (!SCHEDULABLE_STATUSES.has(current.status)) {
      return failResult(
        "Bu durumdaki haber planlanamaz. Yalnızca taslak, inceleme veya planlı haberler planlanabilir.",
      );
    }

    if (current.status === "scheduled" && current.scheduled_at === utc) {
      return okResult({ id: parsed.id }, "Haber zaten bu tarihe planlandı");
    }

    const { data, error } = await supabase
      .from("articles")
      .update({
        status: "scheduled" satisfies DbArticleStatus,
        scheduled_at: utc,
        published_at: null,
      })
      .eq("id", parsed.id)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return dbFail("reschedule", error?.message ?? "update failed");
    }

    await writeAuditLog(supabase, {
      actorId: user.id,
      action: "article.schedule",
      entityType: "article",
      entityId: parsed.id,
      beforeData: snapshotArticle(current),
      afterData: snapshotArticle(data as DbArticle),
    });

    revalidateCalendarPaths(parsed.id, (data as DbArticle).slug);
    return okResult({ id: parsed.id }, "Planlanan tarih güncellendi");
  } catch (error) {
    return toActionError(error);
  }
}

export async function clearCalendarSchedule(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = uuidSchema.parse(id);
    const { user, supabase } = await requireAdminAction();
    const fetched = await fetchArticle(supabase, parsed);
    if (fetched.error) return dbFail("clearSchedule.fetch", fetched.error);
    const current = fetched.article;

    if (!current) {
      return failResult("Haber bulunamadı");
    }

    if (current.status === "published") {
      return failResult("Yayınlanmış haberin planı kaldırılamaz");
    }

    if (current.status !== "scheduled" && !current.scheduled_at) {
      return okResult({ id: parsed }, "Haberin zaten planı yok");
    }

    if (current.status === "archived" || current.status === "failed") {
      return failResult("Bu durumdaki haberin planı kaldırılamaz");
    }

    const nextStatus: DbArticleStatus =
      current.status === "scheduled" ? "draft" : current.status;

    if (
      current.status === nextStatus &&
      current.scheduled_at === null
    ) {
      return okResult({ id: parsed }, "Haberin zaten planı yok");
    }

    const { data, error } = await supabase
      .from("articles")
      .update({
        status: nextStatus,
        scheduled_at: null,
      })
      .eq("id", parsed)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return dbFail("clearSchedule", error?.message ?? "update failed");
    }

    await writeAuditLog(supabase, {
      actorId: user.id,
      action: "article.unschedule",
      entityType: "article",
      entityId: parsed,
      beforeData: snapshotArticle(current),
      afterData: snapshotArticle(data as DbArticle),
    });

    revalidateCalendarPaths(parsed, current.slug);
    return okResult({ id: parsed }, "Plan kaldırıldı");
  } catch (error) {
    return toActionError(error);
  }
}

export async function publishCalendarArticle(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = uuidSchema.parse(id);
    await requireAdminAction();
    const result = await publishArticleNow(parsed);
    if (result.ok) {
      revalidatePath("/admin/calendar");
    }
    return result;
  } catch (error) {
    return toActionError(error);
  }
}
