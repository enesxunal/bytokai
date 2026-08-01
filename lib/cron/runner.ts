import "server-only";

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  authorizeCronRequest,
  cronAuthErrorResponse,
  emptyCronResult,
  requiredToggleForJob,
  resolveCronRunStatus,
  toCronHttpBody,
  type CronJobResult,
  type CronJobType,
  type CronRunStatus,
} from "@/lib/cron/auth";
import {
  runIngestJob,
  runMaintenanceJob,
  runProcessJob,
  runPublishJob,
  type JobHandlerContext,
  type JobHandlerResult,
} from "@/lib/cron/jobs";
import {
  DEFAULT_AUTOMATION_SETTINGS,
  type AutomationSettings,
} from "@/lib/admin/automation-settings";
import { createServiceClient } from "@/lib/supabase/server";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("cron.runner");

const LOCK_TTL_SECONDS: Record<CronJobType, number> = {
  ingest: 10 * 60,
  process: 12 * 60,
  publish: 5 * 60,
  maintenance: 8 * 60,
};

export type ExecuteCronOptions = {
  trigger?: "vercel_cron" | "admin_manual" | "test";
  actorId?: string | null;
};

function softCreateServiceClient(): SupabaseClient | null {
  try {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    ) {
      return null;
    }
    return createServiceClient();
  } catch (error) {
    logger.warn("Service client oluşturulamadı", {
      reason: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

async function loadAutomationSettings(
  supabase: SupabaseClient,
): Promise<AutomationSettings> {
  const keys = [
    "automation_enabled",
    "ingestion_enabled",
    "publishing_enabled",
    "daily_min_articles",
    "daily_max_articles",
    "publish_window_start",
    "publish_window_end",
    "min_publish_interval_minutes",
    "max_per_hour",
    "max_process_batch",
    "min_ai_confidence",
  ] as const;

  const { data, error } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", [...keys]);

  if (error || !data) {
    return { ...DEFAULT_AUTOMATION_SETTINGS };
  }

  const map = new Map<string, unknown>();
  for (const row of data) {
    map.set(row.key as string, row.value);
  }

  const defaults = DEFAULT_AUTOMATION_SETTINGS;
  const asBool = (key: string, fallback: boolean) =>
    typeof map.get(key) === "boolean" ? (map.get(key) as boolean) : fallback;
  const asNum = (key: string, fallback: number) =>
    typeof map.get(key) === "number" && Number.isFinite(map.get(key) as number)
      ? (map.get(key) as number)
      : fallback;
  const asStr = (key: string, fallback: string) =>
    typeof map.get(key) === "string" ? (map.get(key) as string) : fallback;

  return {
    automation_enabled: asBool("automation_enabled", defaults.automation_enabled),
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
    publish_window_start: asStr(
      "publish_window_start",
      defaults.publish_window_start,
    ),
    publish_window_end: asStr(
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

function togglesBlockJob(
  jobType: CronJobType,
  settings: AutomationSettings,
): string | null {
  for (const key of requiredToggleForJob(jobType)) {
    if (!settings[key]) {
      return `${key} kapalı`;
    }
  }
  return null;
}

async function acquireLock(
  supabase: SupabaseClient,
  key: string,
  owner: string,
  ttlSeconds: number,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("acquire_system_lock", {
    p_key: key,
    p_owner: owner,
    p_ttl_seconds: ttlSeconds,
  });
  if (error) {
    logger.warn("Lock alınamadı", { key, reason: error.message });
    return false;
  }
  return data === true;
}

async function releaseLock(
  supabase: SupabaseClient,
  key: string,
  owner: string,
): Promise<void> {
  const { error } = await supabase.rpc("release_system_lock", {
    p_key: key,
    p_owner: owner,
  });
  if (error) {
    logger.warn("Lock bırakılamadı", { key, reason: error.message });
  }
}

async function insertJobRun(
  supabase: SupabaseClient,
  jobType: CronJobType,
  metadata: Record<string, unknown>,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("job_runs")
    .insert({
      job_type: jobType,
      status: "running",
      metadata,
    })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    logger.error("job_runs insert başarısız", {
      jobType,
      reason: error?.message ?? "missing row",
    });
    return null;
  }
  return data.id as string;
}

async function finishJobRun(
  supabase: SupabaseClient,
  runId: string,
  result: {
    status: CronRunStatus;
    processed: number;
    succeeded: number;
    failed: number;
    skipped: number;
    message: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await supabase
    .from("job_runs")
    .update({
      status: result.status,
      finished_at: new Date().toISOString(),
      processed_count: result.processed,
      success_count: result.succeeded,
      failure_count: result.failed,
      error_message:
        result.status === "failed" || result.status === "partial"
          ? result.message
          : null,
      metadata: {
        skipped: result.skipped,
        ...(result.metadata ?? {}),
      },
    })
    .eq("id", runId);

  if (error) {
    logger.error("job_runs güncellenemedi", {
      runId,
      reason: error.message,
    });
  }
}

function pickHandler(jobType: CronJobType) {
  switch (jobType) {
    case "ingest":
      return runIngestJob;
    case "process":
      return runProcessJob;
    case "publish":
      return runPublishJob;
    case "maintenance":
      return runMaintenanceJob;
  }
}

/**
 * Shared entrypoint for Vercel cron routes and admin manual triggers.
 */
export async function executeCronJob(
  jobType: CronJobType,
  options: ExecuteCronOptions = {},
): Promise<CronJobResult> {
  const started = Date.now();
  const trigger = options.trigger ?? "vercel_cron";
  const supabase = softCreateServiceClient();

  if (!supabase) {
    return emptyCronResult(
      jobType,
      "failed",
      "Veritabanı yapılandırması eksik",
      Date.now() - started,
    );
  }

  const lockKey = `cron.${jobType}`;
  const lockOwner = `${trigger}:${randomUUID()}`;
  let lockHeld = false;
  let runId: string | null = null;

  try {
    const locked = await acquireLock(
      supabase,
      lockKey,
      lockOwner,
      LOCK_TTL_SECONDS[jobType],
    );
    if (!locked) {
      const skipped = emptyCronResult(
        jobType,
        "skipped",
        "Aynı iş zaten çalışıyor",
        Date.now() - started,
      );
      skipped.ok = true;
      return skipped;
    }
    lockHeld = true;

    const settings = await loadAutomationSettings(supabase);
    const toggleBlock = togglesBlockJob(jobType, settings);
    if (toggleBlock) {
      runId = await insertJobRun(supabase, jobType, {
        trigger,
        actor_id: options.actorId ?? null,
        skip_reason: toggleBlock,
      });
      const skipped = emptyCronResult(
        jobType,
        "skipped",
        `Atlandı: ${toggleBlock}`,
        Date.now() - started,
      );
      skipped.ok = true;
      skipped.runId = runId;
      if (runId) {
        await finishJobRun(supabase, runId, {
          status: "skipped",
          processed: 0,
          succeeded: 0,
          failed: 0,
          skipped: 1,
          message: skipped.message,
          metadata: { trigger, skip_reason: toggleBlock },
        });
      }
      return skipped;
    }

    runId = await insertJobRun(supabase, jobType, {
      trigger,
      actor_id: options.actorId ?? null,
    });
    if (!runId) {
      return emptyCronResult(
        jobType,
        "failed",
        "İş kaydı oluşturulamadı",
        Date.now() - started,
      );
    }

    const ctx: JobHandlerContext = {
      supabase,
      settings,
      trigger,
      actorId: options.actorId ?? null,
      runId,
    };

    let handlerResult: JobHandlerResult;
    try {
      handlerResult = await pickHandler(jobType)(ctx);
    } catch (error) {
      logger.error("Cron job beklenmeyen hata", {
        jobType,
        reason: error instanceof Error ? error.message : "unknown",
      });
      handlerResult = {
        processed: 0,
        succeeded: 0,
        failed: 1,
        skipped: 0,
        message: "İşlem tamamlanamadı",
        skippedOnly: false,
      };
    }

    const status = resolveCronRunStatus({
      skippedOnly: handlerResult.skippedOnly === true,
      succeeded: handlerResult.succeeded,
      failed: handlerResult.failed,
      processed: handlerResult.processed,
    });

    const result: CronJobResult = {
      ok: status !== "failed",
      jobType,
      status,
      processed: handlerResult.processed,
      succeeded: handlerResult.succeeded,
      failed: handlerResult.failed,
      skipped: handlerResult.skipped,
      durationMs: Date.now() - started,
      message: handlerResult.message,
      runId,
    };

    await finishJobRun(supabase, runId, {
      status,
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      skipped: result.skipped,
      message: result.message,
      metadata: { trigger, ...(handlerResult.metadata ?? {}) },
    });

    return result;
  } finally {
    if (lockHeld) {
      await releaseLock(supabase, lockKey, lockOwner);
    }
  }
}

export async function handleCronRoute(
  request: Request,
  jobType: CronJobType,
): Promise<NextResponse> {
  const auth = authorizeCronRequest(request);
  if (!auth.ok) {
    return cronAuthErrorResponse(auth);
  }

  const result = await executeCronJob(jobType, { trigger: "vercel_cron" });
  return NextResponse.json(toCronHttpBody(result), {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
