import "server-only";

import { existsSync } from "node:fs";
import path from "node:path";

import { hasSupabaseEnv, getSafeClient } from "@/lib/database/safe-client";
import {
  AUTOMATION_SETTING_KEYS,
  DEFAULT_AUTOMATION_SETTINGS,
  MANUAL_JOB_LABELS,
  MANUAL_JOB_TYPES,
  TIME_HHMM_REGEX,
  sanitizeErrorSummary,
  type AutomationJobSummary,
  type AutomationPageData,
  type AutomationSettings,
  type ManualJobKind,
  type ManualJobReadiness,
} from "@/lib/admin/automation-settings";
import type { IngestionRun, JobRun } from "@/types";
import type { DbJobRunStatus } from "@/lib/database/types";

export type {
  AutomationJobSummary,
  AutomationPageData,
  ManualJobReadiness,
} from "@/lib/admin/automation-settings";

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asTime(value: unknown, fallback: string): string {
  return typeof value === "string" && TIME_HHMM_REGEX.test(value.trim())
    ? value.trim()
    : fallback;
}

function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function isCronSecretConfigured(): boolean {
  return Boolean(process.env.CRON_SECRET?.trim());
}

export function hasCronRoute(job: ManualJobKind): boolean {
  const base = path.join(process.cwd(), "app", "api", "cron", job);
  return (
    existsSync(path.join(base, "route.ts")) ||
    existsSync(path.join(base, "route.js"))
  );
}

export function getManualJobReadiness(job: ManualJobKind): ManualJobReadiness {
  const label = MANUAL_JOB_LABELS[job];
  if (!hasSupabaseEnv()) {
    return {
      job,
      label,
      ready: false,
      reason: "Veritabanı bağlantısı yok",
    };
  }
  if (!isCronSecretConfigured() || !hasCronRoute(job)) {
    return {
      job,
      label,
      ready: false,
      reason: "Henüz hazır değil",
    };
  }
  if (job === "process" && !isGeminiConfigured()) {
    return {
      job,
      label,
      ready: false,
      reason: "Henüz hazır değil",
    };
  }
  return { job, label, ready: true, reason: null };
}

function mapSettings(map: Map<string, unknown>): AutomationSettings {
  const defaults = DEFAULT_AUTOMATION_SETTINGS;
  return {
    automation_enabled: asBoolean(
      map.get("automation_enabled"),
      defaults.automation_enabled,
    ),
    ingestion_enabled: asBoolean(
      map.get("ingestion_enabled"),
      defaults.ingestion_enabled,
    ),
    publishing_enabled: asBoolean(
      map.get("publishing_enabled"),
      defaults.publishing_enabled,
    ),
    daily_min_articles: asNumber(
      map.get("daily_min_articles"),
      defaults.daily_min_articles,
    ),
    daily_max_articles: asNumber(
      map.get("daily_max_articles"),
      defaults.daily_max_articles,
    ),
    publish_window_start: asTime(
      map.get("publish_window_start"),
      defaults.publish_window_start,
    ),
    publish_window_end: asTime(
      map.get("publish_window_end"),
      defaults.publish_window_end,
    ),
    min_publish_interval_minutes: asNumber(
      map.get("min_publish_interval_minutes"),
      defaults.min_publish_interval_minutes,
    ),
    max_per_hour: asNumber(map.get("max_per_hour"), defaults.max_per_hour),
    max_process_batch: asNumber(
      map.get("max_process_batch"),
      defaults.max_process_batch,
    ),
    min_ai_confidence: asNumber(
      map.get("min_ai_confidence"),
      defaults.min_ai_confidence,
    ),
  };
}

async function headCount(
  promise: PromiseLike<{
    count: number | null;
    error: { message: string } | null;
  }>,
): Promise<number | null> {
  const { count, error } = await promise;
  if (error) return null;
  return count ?? 0;
}

function summarizeIngestion(run: IngestionRun | null): AutomationJobSummary {
  return {
    kind: "ingestion",
    label: "Son kaynak tarama",
    id: run?.id ?? null,
    status: (run?.status as DbJobRunStatus | undefined) ?? null,
    started_at: run?.started_at ?? null,
    finished_at: run?.finished_at ?? null,
    processed: run ? run.discovered_count : null,
    success: run ? run.inserted_count : null,
    failed: run
      ? Math.max(
          0,
          run.discovered_count - run.inserted_count - run.duplicate_count,
        )
      : null,
    error_summary: run?.error_message
      ? sanitizeErrorSummary(run.error_message)
      : null,
  };
}

function summarizeJob(
  kind: ManualJobKind,
  label: string,
  run: JobRun | null,
): AutomationJobSummary {
  return {
    kind,
    label,
    id: run?.id ?? null,
    status: (run?.status as DbJobRunStatus | undefined) ?? null,
    started_at: run?.started_at ?? null,
    finished_at: run?.finished_at ?? null,
    processed: run?.processed_count ?? null,
    success: run?.success_count ?? null,
    failed: run?.failure_count ?? null,
    error_summary: run?.error_message
      ? sanitizeErrorSummary(run.error_message)
      : null,
  };
}

function emptyPageData(
  partial?: Partial<AutomationPageData>,
): AutomationPageData {
  const jobs: ManualJobKind[] = [
    "ingest",
    "process",
    "publish",
    "maintenance",
  ];
  return {
    connected: false,
    settingsKnown: false,
    settings: { ...DEFAULT_AUTOMATION_SETTINGS },
    settingsUpdatedAt: null,
    readiness: {
      supabaseConfigured: hasSupabaseEnv(),
      geminiConfigured: isGeminiConfigured(),
      cronSecretConfigured: isCronSecretConfigured(),
      activeSources: null,
      scheduledArticles: null,
      pendingRawArticles: null,
    },
    manualJobs: jobs.map(getManualJobReadiness),
    recentRuns: [
      summarizeIngestion(null),
      summarizeJob("process", "Son kuyruk işlemi", null),
      summarizeJob("publish", "Son yayın işlemi", null),
      summarizeJob("maintenance", "Son bakım işlemi", null),
    ],
    ...partial,
  };
}

export async function loadAutomationPage(): Promise<AutomationPageData> {
  const supabaseConfigured = hasSupabaseEnv();
  const geminiConfigured = isGeminiConfigured();
  const cronSecretConfigured = isCronSecretConfigured();
  const manualJobs = (
    ["ingest", "process", "publish", "maintenance"] as ManualJobKind[]
  ).map(getManualJobReadiness);

  const base = emptyPageData({
    readiness: {
      supabaseConfigured,
      geminiConfigured,
      cronSecretConfigured,
      activeSources: null,
      scheduledArticles: null,
      pendingRawArticles: null,
    },
    manualJobs,
  });

  const supabase = await getSafeClient();
  if (!supabase) {
    return base;
  }

  try {
    const settingsResult = await supabase
      .from("site_settings")
      .select("key, value, updated_at")
      .in("key", [...AUTOMATION_SETTING_KEYS]);

    const map = new Map<string, unknown>();
    let settingsUpdatedAt: string | null = null;

    if (!settingsResult.error && settingsResult.data) {
      for (const row of settingsResult.data) {
        map.set(row.key as string, row.value);
        const updated = row.updated_at as string | null;
        if (
          updated &&
          (!settingsUpdatedAt ||
            new Date(updated).getTime() > new Date(settingsUpdatedAt).getTime())
        ) {
          settingsUpdatedAt = updated;
        }
      }
    }

    const settings = mapSettings(map);
    const settingsKnown = !settingsResult.error;

    const [
      activeSources,
      scheduledArticles,
      pendingRawArticles,
      lastIngestionResult,
      lastProcessResult,
      lastPublishResult,
      lastMaintenanceResult,
    ] = await Promise.all([
      headCount(
        supabase
          .from("sources")
          .select("*", { count: "exact", head: true })
          .eq("enabled", true),
      ),
      headCount(
        supabase
          .from("articles")
          .select("*", { count: "exact", head: true })
          .eq("status", "scheduled"),
      ),
      headCount(
        supabase
          .from("raw_articles")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
      ),
      supabase
        .from("ingestion_runs")
        .select(
          "id, source_id, started_at, finished_at, status, discovered_count, inserted_count, duplicate_count, error_message, metadata",
        )
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("job_runs")
        .select(
          "id, job_type, started_at, finished_at, status, processed_count, success_count, failure_count, error_message, metadata",
        )
        .eq("job_type", MANUAL_JOB_TYPES.process)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("job_runs")
        .select(
          "id, job_type, started_at, finished_at, status, processed_count, success_count, failure_count, error_message, metadata",
        )
        .eq("job_type", MANUAL_JOB_TYPES.publish)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("job_runs")
        .select(
          "id, job_type, started_at, finished_at, status, processed_count, success_count, failure_count, error_message, metadata",
        )
        .eq("job_type", MANUAL_JOB_TYPES.maintenance)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    return {
      connected: true,
      settingsKnown,
      settings,
      settingsUpdatedAt,
      readiness: {
        supabaseConfigured,
        geminiConfigured,
        cronSecretConfigured,
        activeSources,
        scheduledArticles,
        pendingRawArticles,
      },
      manualJobs,
      recentRuns: [
        summarizeIngestion(
          lastIngestionResult.error
            ? null
            : ((lastIngestionResult.data as IngestionRun | null) ?? null),
        ),
        summarizeJob(
          "process",
          "Son kuyruk işlemi",
          lastProcessResult.error
            ? null
            : ((lastProcessResult.data as JobRun | null) ?? null),
        ),
        summarizeJob(
          "publish",
          "Son yayın işlemi",
          lastPublishResult.error
            ? null
            : ((lastPublishResult.data as JobRun | null) ?? null),
        ),
        summarizeJob(
          "maintenance",
          "Son bakım işlemi",
          lastMaintenanceResult.error
            ? null
            : ((lastMaintenanceResult.data as JobRun | null) ?? null),
        ),
      ],
    };
  } catch {
    return {
      ...base,
      connected: false,
      settingsKnown: false,
    };
  }
}
