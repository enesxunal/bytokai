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
import { requireAdminAction } from "@/lib/auth/session";
import type { DbSource } from "@/lib/database/types";
import {
  fetchRssNormalizedItems,
  fetchWithHtmlFallback,
} from "@/lib/sources/base";
import { DEFAULT_FETCH_TIMEOUT_MS } from "@/lib/sources/types";
import { SourceFetchError } from "@/lib/utils/errors";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("admin.source-actions");

const UNHEALTHY_FAILURE_THRESHOLD = 3;
const STALE_RUN_MS = 5 * 60 * 1000;

const uuidSchema = z.string().uuid("Geçersiz kaynak kimliği");

const httpUrlSchema = z
  .string()
  .trim()
  .min(1, "URL gerekli")
  .max(2000)
  .refine((value) => /^https?:\/\//i.test(value), {
    message: "URL http:// veya https:// ile başlamalı",
  });

const optionalFeedUrlSchema = z
  .string()
  .trim()
  .max(2000)
  .refine((value) => !value || /^https?:\/\//i.test(value), {
    message: "Feed URL http:// veya https:// ile başlamalı",
  });

const sourceInputSchema = z.object({
  name: z.string().trim().min(1, "Ad gerekli").max(200),
  slug: z
    .string()
    .trim()
    .min(1, "Slug gerekli")
    .max(120)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug yalnızca küçük harf, rakam ve tire içerebilir",
    ),
  homepage_url: httpUrlSchema,
  section_url: httpUrlSchema,
  feed_url: optionalFeedUrlSchema,
  ingestion_type: z.enum(["rss", "html", "manual"]),
  enabled: z.boolean(),
  priority: z
    .number({ message: "Öncelik sayı olmalı" })
    .int("Öncelik tam sayı olmalı")
    .min(1, "Öncelik en az 1 olmalı")
    .max(10_000, "Öncelik en fazla 10000 olabilir"),
  default_language: z
    .string()
    .trim()
    .min(2, "Dil kodu gerekli")
    .max(16, "Dil kodu çok uzun")
    .regex(/^[a-z]{2}(-[A-Za-z]{2})?$/, "Dil kodu örn. en veya tr olmalı"),
});

const updateSourceSchema = sourceInputSchema.extend({
  id: uuidSchema,
});

export type SourceFormInput = z.infer<typeof sourceInputSchema>;
export type UpdateSourceInput = z.infer<typeof updateSourceSchema>;

function dbFail(action: string, reason: string): ActionResult<never> {
  logger.error("Kaynak işlemi başarısız", { action, reason });
  return failResult("İşlem tamamlanamadı. Lütfen tekrar deneyin.");
}

function snapshotSource(source: DbSource): Record<string, unknown> {
  return {
    id: source.id,
    name: source.name,
    slug: source.slug,
    homepage_url: source.homepage_url,
    section_url: source.section_url,
    feed_url: source.feed_url,
    ingestion_type: source.ingestion_type,
    enabled: source.enabled,
    priority: source.priority,
    default_language: source.default_language,
    consecutive_failures: source.consecutive_failures,
    is_unhealthy: source.is_unhealthy,
  };
}

function revalidateSourcePaths(id?: string) {
  revalidatePath("/admin/sources");
  if (id) {
    revalidatePath(`/admin/sources/${id}`);
    revalidatePath(`/admin/sources/${id}/edit`);
  }
  revalidatePath("/admin");
  revalidatePath("/kaynaklar");
}

async function fetchSource(
  supabase: Awaited<ReturnType<typeof requireAdminAction>>["supabase"],
  id: string,
): Promise<{ source: DbSource | null; error: string | null }> {
  const { data, error } = await supabase
    .from("sources")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return { source: null, error: error.message };
  }

  return { source: (data as DbSource | null) ?? null, error: null };
}

function valuesEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function normalizeFeedUrl(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function createSource(
  input: SourceFormInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = sourceInputSchema.parse(input);
    const { user, supabase } = await requireAdminAction();

    const { data: slugConflict } = await supabase
      .from("sources")
      .select("id")
      .eq("slug", parsed.slug)
      .maybeSingle();

    if (slugConflict) {
      return failResult("Bu slug zaten kullanılıyor", {
        slug: ["Bu slug zaten kullanılıyor"],
      });
    }

    const payload = {
      name: parsed.name,
      slug: parsed.slug,
      homepage_url: parsed.homepage_url,
      section_url: parsed.section_url,
      feed_url: normalizeFeedUrl(parsed.feed_url),
      ingestion_type: parsed.ingestion_type,
      enabled: parsed.enabled,
      priority: parsed.priority,
      default_language: parsed.default_language.toLowerCase(),
    };

    const { data, error } = await supabase
      .from("sources")
      .insert(payload)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return dbFail("create", error?.message ?? "insert failed");
    }

    const created = data as DbSource;

    await writeAuditLog(supabase, {
      actorId: user.id,
      action: "source.create",
      entityType: "source",
      entityId: created.id,
      beforeData: null,
      afterData: snapshotSource(created),
    });

    revalidateSourcePaths(created.id);
    return okResult({ id: created.id }, "Kaynak oluşturuldu");
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateSource(
  input: UpdateSourceInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = updateSourceSchema.parse(input);
    const { user, supabase } = await requireAdminAction();
    const fetched = await fetchSource(supabase, parsed.id);
    if (fetched.error) return dbFail("update.fetch", fetched.error);
    const current = fetched.source;

    if (!current) {
      return failResult("Kaynak bulunamadı");
    }

    if (parsed.slug !== current.slug) {
      const { data: slugConflict } = await supabase
        .from("sources")
        .select("id")
        .eq("slug", parsed.slug)
        .neq("id", parsed.id)
        .maybeSingle();

      if (slugConflict) {
        return failResult("Bu slug zaten kullanılıyor", {
          slug: ["Bu slug zaten kullanılıyor"],
        });
      }
    }

    const nextPatch = {
      name: parsed.name,
      slug: parsed.slug,
      homepage_url: parsed.homepage_url,
      section_url: parsed.section_url,
      feed_url: normalizeFeedUrl(parsed.feed_url),
      ingestion_type: parsed.ingestion_type,
      enabled: parsed.enabled,
      priority: parsed.priority,
      default_language: parsed.default_language.toLowerCase(),
    };

    const currentComparable = {
      name: current.name,
      slug: current.slug,
      homepage_url: current.homepage_url,
      section_url: current.section_url,
      feed_url: current.feed_url,
      ingestion_type: current.ingestion_type,
      enabled: current.enabled,
      priority: current.priority,
      default_language: current.default_language,
    };

    if (valuesEqual(currentComparable, nextPatch)) {
      return okResult({ id: parsed.id }, "Değişiklik yok");
    }

    const { data, error } = await supabase
      .from("sources")
      .update(nextPatch)
      .eq("id", parsed.id)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return dbFail("update", error?.message ?? "update failed");
    }

    await writeAuditLog(supabase, {
      actorId: user.id,
      action: "source.update",
      entityType: "source",
      entityId: parsed.id,
      beforeData: snapshotSource(current),
      afterData: snapshotSource(data as DbSource),
    });

    revalidateSourcePaths(parsed.id);
    return okResult({ id: parsed.id }, "Kaynak kaydedildi");
  } catch (error) {
    return toActionError(error);
  }
}

export async function setSourceEnabled(
  id: string,
  enabled: boolean,
): Promise<ActionResult<{ id: string; enabled: boolean }>> {
  try {
    const parsed = uuidSchema.parse(id);
    const enabledFlag = z.boolean().parse(enabled);
    const { user, supabase } = await requireAdminAction();
    const fetched = await fetchSource(supabase, parsed);
    if (fetched.error) return dbFail("setEnabled.fetch", fetched.error);
    const current = fetched.source;

    if (!current) {
      return failResult("Kaynak bulunamadı");
    }

    if (current.enabled === enabledFlag) {
      return okResult(
        { id: parsed, enabled: enabledFlag },
        enabledFlag ? "Kaynak zaten aktif" : "Kaynak zaten pasif",
      );
    }

    const { data, error } = await supabase
      .from("sources")
      .update({ enabled: enabledFlag })
      .eq("id", parsed)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return dbFail("setEnabled", error?.message ?? "update failed");
    }

    await writeAuditLog(supabase, {
      actorId: user.id,
      action: enabledFlag ? "source.enable" : "source.disable",
      entityType: "source",
      entityId: parsed,
      beforeData: snapshotSource(current),
      afterData: snapshotSource(data as DbSource),
    });

    revalidateSourcePaths(parsed);
    return okResult(
      { id: parsed, enabled: enabledFlag },
      enabledFlag ? "Kaynak aktifleştirildi" : "Kaynak pasifleştirildi",
    );
  } catch (error) {
    return toActionError(error);
  }
}

export async function resetSourceFailureCount(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = uuidSchema.parse(id);
    const { user, supabase } = await requireAdminAction();
    const fetched = await fetchSource(supabase, parsed);
    if (fetched.error) return dbFail("resetFailures.fetch", fetched.error);
    const current = fetched.source;

    if (!current) {
      return failResult("Kaynak bulunamadı");
    }

    if (current.consecutive_failures === 0 && !current.is_unhealthy) {
      return okResult({ id: parsed }, "Hata sayacı zaten sıfır");
    }

    const { data, error } = await supabase
      .from("sources")
      .update({
        consecutive_failures: 0,
        is_unhealthy: false,
      })
      .eq("id", parsed)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return dbFail("resetFailures", error?.message ?? "update failed");
    }

    await writeAuditLog(supabase, {
      actorId: user.id,
      action: "source.reset_failures",
      entityType: "source",
      entityId: parsed,
      beforeData: snapshotSource(current),
      afterData: snapshotSource(data as DbSource),
    });

    revalidateSourcePaths(parsed);
    return okResult({ id: parsed }, "Hata sayacı sıfırlandı");
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteSource(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = uuidSchema.parse(id);
    const { user, supabase } = await requireAdminAction();
    const fetched = await fetchSource(supabase, parsed);
    if (fetched.error) return dbFail("delete.fetch", fetched.error);
    const current = fetched.source;

    if (!current) {
      return okResult({ id: parsed }, "Kaynak zaten silinmiş");
    }

    const { count, error: countError } = await supabase
      .from("raw_articles")
      .select("id", { count: "exact", head: true })
      .eq("source_id", parsed);

    if (countError) {
      return dbFail("delete.count", countError.message);
    }

    if ((count ?? 0) > 0) {
      return failResult(
        `Bu kaynağa bağlı ${count} ham haber var. Silmek yerine kaynağı pasifleştirin.`,
      );
    }

    const { error } = await supabase.from("sources").delete().eq("id", parsed);

    if (error) {
      return dbFail("delete", error.message);
    }

    await writeAuditLog(supabase, {
      actorId: user.id,
      action: "source.delete",
      entityType: "source",
      entityId: parsed,
      beforeData: snapshotSource(current),
      afterData: null,
    });

    revalidateSourcePaths();
    return okResult({ id: parsed }, "Kaynak silindi");
  } catch (error) {
    return toActionError(error);
  }
}

export async function checkSourceNow(
  id: string,
): Promise<
  ActionResult<{
    id: string;
    runId: string;
    discovered: number;
    status: "success" | "failed";
  }>
> {
  try {
    const parsed = uuidSchema.parse(id);
    const { user, supabase } = await requireAdminAction();
    const fetched = await fetchSource(supabase, parsed);
    if (fetched.error) return dbFail("check.fetch", fetched.error);
    const current = fetched.source;

    if (!current) {
      return failResult("Kaynak bulunamadı");
    }

    const { data: runningRuns, error: runningError } = await supabase
      .from("ingestion_runs")
      .select("id, started_at")
      .eq("source_id", parsed)
      .eq("status", "running")
      .order("started_at", { ascending: false })
      .limit(5);

    if (runningError) {
      return dbFail("check.running", runningError.message);
    }

    const now = Date.now();
    for (const run of runningRuns ?? []) {
      const started = new Date(run.started_at as string).getTime();
      if (Number.isFinite(started) && now - started < STALE_RUN_MS) {
        return failResult(
          "Bu kaynak için zaten bir kontrol çalışıyor. Lütfen bitmesini bekleyin.",
        );
      }

      await supabase
        .from("ingestion_runs")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          error_message: "Kontrol zaman aşımına uğradı veya yarım kaldı",
        })
        .eq("id", run.id as string)
        .eq("status", "running");
    }

    const { data: runRow, error: runInsertError } = await supabase
      .from("ingestion_runs")
      .insert({
        source_id: parsed,
        status: "running",
        metadata: { trigger: "admin_manual_check" },
      })
      .select("id")
      .maybeSingle();

    if (runInsertError || !runRow) {
      return dbFail("check.runInsert", runInsertError?.message ?? "insert failed");
    }

    const runId = runRow.id as string;
    const checkedAt = new Date().toISOString();
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      DEFAULT_FETCH_TIMEOUT_MS,
    );

    let discovered = 0;
    let checkStatus: "success" | "failed" = "success";
    let safeError: string | null = null;

    try {
      if (current.ingestion_type === "manual") {
        discovered = 0;
        checkStatus = "success";
      } else if (current.ingestion_type === "rss") {
        if (!current.feed_url) {
          throw new SourceFetchError("RSS kaynağı için feed URL gerekli");
        }
        const items = await fetchRssNormalizedItems({
          feedUrl: current.feed_url,
          sourceId: current.id,
          maxItems: 25,
          signal: controller.signal,
        });
        discovered = items.length;
      } else {
        const items = await fetchWithHtmlFallback({
          feedUrl: current.feed_url,
          listingUrl: current.section_url,
          sourceId: current.id,
          maxItems: 25,
          signal: controller.signal,
        });
        discovered = items.length;
      }
    } catch (error) {
      checkStatus = "failed";
      if (error instanceof SourceFetchError) {
        safeError = "Kaynak feed veya sayfasına erişilemedi";
      } else if (
        error instanceof Error &&
        (error.name === "AbortError" || controller.signal.aborted)
      ) {
        safeError = "Kontrol zaman aşımına uğradı";
      } else {
        safeError = "Kaynak kontrolü başarısız oldu";
      }
      logger.warn("Kaynak kontrolü başarısız", {
        sourceId: parsed,
        reason: error instanceof Error ? error.message : String(error),
      });
    } finally {
      clearTimeout(timeout);
    }

    const failures =
      checkStatus === "success" ? 0 : current.consecutive_failures + 1;
    const sourcePatch =
      checkStatus === "success"
        ? {
            last_checked_at: checkedAt,
            last_success_at: checkedAt,
            consecutive_failures: 0,
            is_unhealthy: false,
          }
        : {
            last_checked_at: checkedAt,
            last_error_at: checkedAt,
            consecutive_failures: failures,
            is_unhealthy: failures >= UNHEALTHY_FAILURE_THRESHOLD,
          };

    const { data: updatedSource, error: sourceUpdateError } = await supabase
      .from("sources")
      .update(sourcePatch)
      .eq("id", parsed)
      .select("*")
      .maybeSingle();

    if (sourceUpdateError || !updatedSource) {
      await supabase
        .from("ingestion_runs")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          error_message: "Kaynak durumu güncellenemedi",
          discovered_count: discovered,
        })
        .eq("id", runId);
      return dbFail("check.sourceUpdate", sourceUpdateError?.message ?? "update failed");
    }

    const finishedAt = new Date().toISOString();
    const { error: runUpdateError } = await supabase
      .from("ingestion_runs")
      .update({
        status: checkStatus,
        finished_at: finishedAt,
        discovered_count: discovered,
        inserted_count: 0,
        duplicate_count: 0,
        error_message: safeError,
        metadata: {
          trigger: "admin_manual_check",
          ingestion_type: current.ingestion_type,
        },
      })
      .eq("id", runId);

    if (runUpdateError) {
      logger.error("Ingestion run güncellenemedi", {
        runId,
        reason: runUpdateError.message,
      });
    }

    await writeAuditLog(supabase, {
      actorId: user.id,
      action: "source.check",
      entityType: "source",
      entityId: parsed,
      beforeData: snapshotSource(current),
      afterData: {
        ...snapshotSource(updatedSource as DbSource),
        check_status: checkStatus,
        discovered,
        run_id: runId,
      },
    });

    revalidateSourcePaths(parsed);

    if (checkStatus === "failed") {
      return okResult(
        { id: parsed, runId, discovered, status: checkStatus },
        safeError ?? "Kaynak kontrolü başarısız oldu",
      );
    }

    if (current.ingestion_type === "manual") {
      return okResult(
        { id: parsed, runId, discovered, status: checkStatus },
        "Manuel kaynaklar otomatik içerik çekmez; kontrol kaydı oluşturuldu",
      );
    }

    return okResult(
      { id: parsed, runId, discovered, status: checkStatus },
      `Kontrol tamamlandı: ${discovered} öğe bulundu`,
    );
  } catch (error) {
    return toActionError(error);
  }
}
