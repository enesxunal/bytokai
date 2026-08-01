"use server";

import { revalidatePath } from "next/cache";

import {
  failResult,
  okResult,
  toActionError,
  type ActionResult,
} from "@/lib/admin/action-result";
import { writeAuditLog } from "@/lib/admin/audit";
import { hasCronRoute } from "@/lib/admin/automation";
import {
  MANUAL_JOB_KIND_SCHEMA,
  MANUAL_JOB_LABELS,
  sanitizeErrorSummary,
  automationSettingsSchema,
  settingsEqual,
  toSettingJsonValue,
  AUTOMATION_SETTING_KEYS,
  DEFAULT_AUTOMATION_SETTINGS,
  TIME_HHMM_REGEX,
  type AutomationSettingKey,
  type AutomationSettings,
  type AutomationSettingsInput,
  type ManualJobKind,
} from "@/lib/admin/automation-settings";
import { executeCronJob } from "@/lib/cron/runner";
import { requireAdminAction } from "@/lib/auth/session";
import { hasSupabaseEnv } from "@/lib/database/safe-client";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("admin.automation-actions");

function dbFail(action: string, reason: string): ActionResult<never> {
  logger.error("Otomasyon işlemi başarısız", { action, reason });
  return failResult("İşlem tamamlanamadı. Lütfen tekrar deneyin.");
}

function revalidateAutomationPaths() {
  revalidatePath("/admin/automation");
  revalidatePath("/admin");
}

function coerceSettings(map: Map<string, unknown>): AutomationSettings {
  const defaults = DEFAULT_AUTOMATION_SETTINGS;
  const asBool = (key: AutomationSettingKey, fallback: boolean) =>
    typeof map.get(key) === "boolean" ? (map.get(key) as boolean) : fallback;
  const asNum = (key: AutomationSettingKey, fallback: number) =>
    typeof map.get(key) === "number" && Number.isFinite(map.get(key) as number)
      ? (map.get(key) as number)
      : fallback;
  const asTime = (key: AutomationSettingKey, fallback: string) => {
    const value = map.get(key);
    return typeof value === "string" && TIME_HHMM_REGEX.test(value.trim())
      ? value.trim()
      : fallback;
  };

  return {
    automation_enabled: asBool(
      "automation_enabled",
      defaults.automation_enabled,
    ),
    ingestion_enabled: asBool("ingestion_enabled", defaults.ingestion_enabled),
    publishing_enabled: asBool(
      "publishing_enabled",
      defaults.publishing_enabled,
    ),
    daily_min_articles: asNum(
      "daily_min_articles",
      defaults.daily_min_articles,
    ),
    daily_max_articles: asNum(
      "daily_max_articles",
      defaults.daily_max_articles,
    ),
    publish_window_start: asTime(
      "publish_window_start",
      defaults.publish_window_start,
    ),
    publish_window_end: asTime(
      "publish_window_end",
      defaults.publish_window_end,
    ),
    min_publish_interval_minutes: asNum(
      "min_publish_interval_minutes",
      defaults.min_publish_interval_minutes,
    ),
    max_per_hour: asNum("max_per_hour", defaults.max_per_hour),
    max_process_batch: asNum("max_process_batch", defaults.max_process_batch),
    min_ai_confidence: asNum("min_ai_confidence", defaults.min_ai_confidence),
  };
}

async function loadCurrentSettings(
  supabase: Awaited<ReturnType<typeof requireAdminAction>>["supabase"],
): Promise<{ settings: AutomationSettings; error: string | null }> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", [...AUTOMATION_SETTING_KEYS]);

  if (error) {
    return {
      settings: { ...DEFAULT_AUTOMATION_SETTINGS },
      error: error.message,
    };
  }

  const map = new Map<string, unknown>();
  for (const row of data ?? []) {
    map.set(row.key as string, row.value);
  }

  return { settings: coerceSettings(map), error: null };
}

export async function updateAutomationSettings(
  input: AutomationSettingsInput,
): Promise<ActionResult<{ updatedKeys: string[] }>> {
  try {
    if (!hasSupabaseEnv()) {
      return failResult("Veritabanı bağlantısı yok; ayarlar kaydedilemedi");
    }

    const parsed = automationSettingsSchema.parse(input);
    const { user, supabase } = await requireAdminAction();
    const current = await loadCurrentSettings(supabase);
    if (current.error) {
      return dbFail("settings.load", current.error);
    }

    if (settingsEqual(current.settings, parsed)) {
      return okResult({ updatedKeys: [] }, "Değişiklik yok");
    }

    const changedKeys: AutomationSettingKey[] = AUTOMATION_SETTING_KEYS.filter(
      (key) => current.settings[key] !== parsed[key],
    );

    const beforeData: Record<string, unknown> = {};
    const afterData: Record<string, unknown> = {};

    for (const key of changedKeys) {
      beforeData[key] = current.settings[key];
      afterData[key] = parsed[key];

      const { error } = await supabase.from("site_settings").upsert(
        {
          key,
          value: toSettingJsonValue(parsed[key]),
        },
        { onConflict: "key" },
      );

      if (error) {
        return dbFail(`settings.upsert.${key}`, error.message);
      }
    }

    await writeAuditLog(supabase, {
      actorId: user.id,
      action: "automation.settings.update",
      entityType: "site_settings",
      entityId: null,
      beforeData,
      afterData,
    });

    revalidateAutomationPaths();
    return okResult(
      { updatedKeys: changedKeys },
      "Otomasyon ayarları güncellendi",
    );
  } catch (error) {
    return toActionError(error);
  }
}

export async function runManualAutomationJob(
  jobInput: ManualJobKind,
): Promise<ActionResult<{ job: ManualJobKind; runId: string | null }>> {
  try {
    const job = MANUAL_JOB_KIND_SCHEMA.parse(jobInput);
    const label = MANUAL_JOB_LABELS[job];

    if (!hasSupabaseEnv()) {
      return failResult("Veritabanı bağlantısı yok; işlem başlatılamadı");
    }

    if (!hasCronRoute(job)) {
      return failResult("Henüz hazır değil");
    }

    const { user, supabase } = await requireAdminAction();

    const result = await executeCronJob(job, {
      trigger: "admin_manual",
      actorId: user.id,
    });

    await writeAuditLog(supabase, {
      actorId: user.id,
      action: `automation.manual.${job}`,
      entityType: "job_run",
      entityId: result.runId ?? null,
      afterData: {
        status: result.status,
        processed: result.processed,
        succeeded: result.succeeded,
        failed: result.failed,
        skipped: result.skipped,
      },
    });

    revalidateAutomationPaths();

    if (result.status === "failed") {
      return failResult(
        sanitizeErrorSummary(result.message || "İşlem tamamlanamadı"),
      );
    }

    if (result.status === "skipped") {
      return okResult(
        { job, runId: result.runId ?? null },
        result.message || `${label} atlandı`,
      );
    }

    return okResult(
      { job, runId: result.runId ?? null },
      result.message || `${label} tamamlandı`,
    );
  } catch (error) {
    return toActionError(error);
  }
}
