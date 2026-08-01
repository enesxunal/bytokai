import "server-only";

import { hasSupabaseEnv, getSafeClient } from "@/lib/database/safe-client";
import { getSettingValue } from "@/lib/database/settings";
import { ISTANBUL_TIMEZONE } from "@/lib/utils/date";
import type { IngestionRun, JobRun } from "@/types";

export type DashboardMetricValue = number | null;

export type DashboardOverview = {
  connected: boolean;
  stats: {
    discoveredToday: DashboardMetricValue;
    generatedToday: DashboardMetricValue;
    publishedToday: DashboardMetricValue;
    scheduledCount: DashboardMetricValue;
    failedCount: DashboardMetricValue;
    activeSources: DashboardMetricValue;
    lastSuccessfulCron: string | null;
    aiSuccessRate: DashboardMetricValue;
  };
  pipelineBars: Array<{
    key: string;
    label: string;
    value: number;
  }>;
  recentJobRuns: JobRun[];
  recentIngestionRuns: Array<IngestionRun & { source_name: string | null }>;
  systemStatus: {
    ingestionEnabled: boolean | null;
    publishingEnabled: boolean | null;
    automationEnabled: boolean | null;
    geminiConfigured: boolean;
    supabaseConfigured: boolean;
  };
};

const EMPTY_STATS: DashboardOverview["stats"] = {
  discoveredToday: null,
  generatedToday: null,
  publishedToday: null,
  scheduledCount: null,
  failedCount: null,
  activeSources: null,
  lastSuccessfulCron: null,
  aiSuccessRate: null,
};

function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function getIstanbulParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: ISTANBUL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const lookup = (type: Intl.DateTimeFormatPartTypes): number => {
    const value = parts.find((part) => part.type === type)?.value;
    if (!value) {
      throw new Error(`Istanbul zaman parçası bulunamadı: ${type}`);
    }
    return Number(value);
  };

  return {
    year: lookup("year"),
    month: lookup("month"),
    day: lookup("day"),
  };
}

/** Istanbul wall-clock → gerçek UTC ISO. */
function istanbulWallToUtcIso(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
): string {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: ISTANBUL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(new Date(utcGuess));
  const n = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  const istanbulAsUtc = Date.UTC(
    n("year"),
    n("month") - 1,
    n("day"),
    n("hour"),
    n("minute"),
    n("second"),
  );
  const desiredAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return new Date(utcGuess + (desiredAsUtc - istanbulAsUtc)).toISOString();
}

function getTodayBoundsIso(now = new Date()): { start: string; endExclusive: string } {
  const parts = getIstanbulParts(now);
  const start = istanbulWallToUtcIso(parts.year, parts.month, parts.day, 0, 0, 0);
  const next = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1));
  const endExclusive = istanbulWallToUtcIso(
    next.getUTCFullYear(),
    next.getUTCMonth() + 1,
    next.getUTCDate(),
    0,
    0,
    0,
  );
  return { start, endExclusive };
}

async function headCount(
  promise: PromiseLike<{ count: number | null; error: { message: string } | null }>,
): Promise<number | null> {
  const { count, error } = await promise;
  if (error) return null;
  return count ?? 0;
}

export async function loadDashboardOverview(): Promise<DashboardOverview> {
  const supabaseConfigured = hasSupabaseEnv();
  const geminiConfigured = isGeminiConfigured();

  const [ingestionEnabled, publishingEnabled, automationEnabled] =
    await Promise.all([
      getSettingValue<boolean>("ingestion_enabled", true),
      getSettingValue<boolean>("publishing_enabled", true),
      getSettingValue<boolean>("automation_enabled", true),
    ]);

  const systemStatusBase: DashboardOverview["systemStatus"] = {
    ingestionEnabled: supabaseConfigured ? ingestionEnabled : null,
    publishingEnabled: supabaseConfigured ? publishingEnabled : null,
    automationEnabled: supabaseConfigured ? automationEnabled : null,
    geminiConfigured,
    supabaseConfigured,
  };

  const supabase = await getSafeClient();
  if (!supabase) {
    return {
      connected: false,
      stats: EMPTY_STATS,
      pipelineBars: [],
      recentJobRuns: [],
      recentIngestionRuns: [],
      systemStatus: systemStatusBase,
    };
  }

  const { start, endExclusive } = getTodayBoundsIso();

  try {
    const [
      discoveredToday,
      generatedToday,
      publishedToday,
      scheduledCount,
      failedJobsToday,
      failedAiToday,
      activeSources,
      lastCronResult,
      aiSuccessCount,
      aiFailedCount,
      recentJobsResult,
      recentIngestionResult,
    ] = await Promise.all([
      headCount(
        supabase
          .from("raw_articles")
          .select("*", { count: "exact", head: true })
          .gte("discovered_at", start)
          .lt("discovered_at", endExclusive),
      ),
      headCount(
        supabase
          .from("articles")
          .select("*", { count: "exact", head: true })
          .gte("created_at", start)
          .lt("created_at", endExclusive),
      ),
      headCount(
        supabase
          .from("articles")
          .select("*", { count: "exact", head: true })
          .eq("status", "published")
          .gte("published_at", start)
          .lt("published_at", endExclusive),
      ),
      headCount(
        supabase
          .from("articles")
          .select("*", { count: "exact", head: true })
          .eq("status", "scheduled"),
      ),
      headCount(
        supabase
          .from("job_runs")
          .select("*", { count: "exact", head: true })
          .eq("status", "failed")
          .gte("started_at", start)
          .lt("started_at", endExclusive),
      ),
      headCount(
        supabase
          .from("ai_generations")
          .select("*", { count: "exact", head: true })
          .eq("status", "failed")
          .gte("created_at", start)
          .lt("created_at", endExclusive),
      ),
      headCount(
        supabase
          .from("sources")
          .select("*", { count: "exact", head: true })
          .eq("enabled", true),
      ),
      supabase
        .from("job_runs")
        .select("finished_at, started_at")
        .eq("status", "success")
        .order("finished_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle(),
      headCount(
        supabase
          .from("ai_generations")
          .select("*", { count: "exact", head: true })
          .eq("status", "success"),
      ),
      headCount(
        supabase
          .from("ai_generations")
          .select("*", { count: "exact", head: true })
          .eq("status", "failed"),
      ),
      supabase
        .from("job_runs")
        .select(
          "id, job_type, started_at, finished_at, status, processed_count, success_count, failure_count, error_message, metadata",
        )
        .order("started_at", { ascending: false })
        .limit(8),
      supabase
        .from("ingestion_runs")
        .select(
          "id, source_id, started_at, finished_at, status, discovered_count, inserted_count, duplicate_count, error_message, metadata, source:sources(name)",
        )
        .order("started_at", { ascending: false })
        .limit(8),
    ]);

    const failedCount =
      failedJobsToday === null && failedAiToday === null
        ? null
        : (failedJobsToday ?? 0) + (failedAiToday ?? 0);

    const aiTotal =
      aiSuccessCount === null || aiFailedCount === null
        ? null
        : aiSuccessCount + aiFailedCount;

    const aiSuccessRate =
      aiTotal === null
        ? null
        : aiTotal === 0
          ? null
          : Math.round(((aiSuccessCount ?? 0) / aiTotal) * 1000) / 10;

    const lastSuccessfulCron =
      lastCronResult.error || !lastCronResult.data
        ? null
        : (lastCronResult.data.finished_at ??
          lastCronResult.data.started_at ??
          null);

    const recentJobRuns = (
      recentJobsResult.error ? [] : (recentJobsResult.data ?? [])
    ) as JobRun[];

    type IngestionRow = IngestionRun & {
      source: { name: string } | { name: string }[] | null;
    };

    const recentIngestionRuns = (
      recentIngestionResult.error
        ? []
        : ((recentIngestionResult.data ?? []) as IngestionRow[])
    ).map((row) => {
      const source = Array.isArray(row.source) ? row.source[0] : row.source;
      return {
        id: row.id,
        source_id: row.source_id,
        started_at: row.started_at,
        finished_at: row.finished_at,
        status: row.status,
        discovered_count: row.discovered_count,
        inserted_count: row.inserted_count,
        duplicate_count: row.duplicate_count,
        error_message: row.error_message,
        metadata: row.metadata,
        source_name: source?.name ?? null,
      };
    });

    return {
      connected: true,
      stats: {
        discoveredToday,
        generatedToday,
        publishedToday,
        scheduledCount,
        failedCount,
        activeSources,
        lastSuccessfulCron,
        aiSuccessRate,
      },
      pipelineBars: [
        { key: "discovered", label: "Bulunan", value: discoveredToday ?? 0 },
        { key: "generated", label: "Üretilen", value: generatedToday ?? 0 },
        { key: "published", label: "Yayınlanan", value: publishedToday ?? 0 },
      ],
      recentJobRuns,
      recentIngestionRuns,
      systemStatus: systemStatusBase,
    };
  } catch {
    return {
      connected: false,
      stats: EMPTY_STATS,
      pipelineBars: [],
      recentJobRuns: [],
      recentIngestionRuns: [],
      systemStatus: {
        ...systemStatusBase,
        ingestionEnabled: null,
        publishingEnabled: null,
        automationEnabled: null,
      },
    };
  }
}
