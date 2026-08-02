import "server-only";

import { hasSupabaseEnv, getSafeClient } from "@/lib/database/safe-client";
import { getSettingValue } from "@/lib/database/settings";
import { ISTANBUL_TIMEZONE } from "@/lib/utils/date";
import type { IngestionRun, JobRun } from "@/types";

export type DashboardMetricValue = number | null;

export type DashboardTopArticle = {
  articleId: string;
  title: string;
  slug: string;
  views: number;
  totalSeconds: number;
  avgSeconds: number;
};

export type DashboardTrafficDay = {
  /** Istanbul takvim günü: YYYY-MM-DD */
  date: string;
  /** Kısa etiket: örn. 02 Ağu */
  label: string;
  visitors: number;
  pageViews: number;
  avgDurationSeconds: number;
};

export type DashboardTraffic = {
  visitorsToday: DashboardMetricValue;
  pageViewsToday: DashboardMetricValue;
  avgDurationTodaySeconds: DashboardMetricValue;
  totalDurationTodaySeconds: DashboardMetricValue;
  visitorsLast7Days: DashboardMetricValue;
  pageViewsLast7Days: DashboardMetricValue;
  daily: DashboardTrafficDay[];
  topByViews: DashboardTopArticle[];
  topByTime: DashboardTopArticle[];
};

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
  traffic: DashboardTraffic;
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

const EMPTY_TRAFFIC: DashboardTraffic = {
  visitorsToday: null,
  pageViewsToday: null,
  avgDurationTodaySeconds: null,
  totalDurationTodaySeconds: null,
  visitorsLast7Days: null,
  pageViewsLast7Days: null,
  daily: [],
  topByViews: [],
  topByTime: [],
};

const DAY_LABEL_FORMATTER = new Intl.DateTimeFormat("tr-TR", {
  timeZone: ISTANBUL_TIMEZONE,
  day: "2-digit",
  month: "short",
});

const DAY_KEY_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: ISTANBUL_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function istanbulDayKey(iso: string): string {
  return DAY_KEY_FORMATTER.format(new Date(iso));
}

function buildDailySeries(
  rows: PageViewRow[],
  todayStartIso: string,
  dayCount = 7,
): DashboardTrafficDay[] {
  const todayParts = getIstanbulParts(new Date(todayStartIso));
  const days: DashboardTrafficDay[] = [];

  for (let offset = dayCount - 1; offset >= 0; offset -= 1) {
    const wall = new Date(
      Date.UTC(todayParts.year, todayParts.month - 1, todayParts.day - offset),
    );
    const year = wall.getUTCFullYear();
    const month = wall.getUTCMonth() + 1;
    const day = wall.getUTCDate();
    const date = `${year.toString().padStart(4, "0")}-${month
      .toString()
      .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
    const noonUtc = istanbulWallToUtcIso(year, month, day, 12, 0, 0);
    days.push({
      date,
      label: DAY_LABEL_FORMATTER.format(new Date(noonUtc)),
      visitors: 0,
      pageViews: 0,
      avgDurationSeconds: 0,
    });
  }

  const byDate = new Map(
    days.map((d) => [
      d.date,
      { visitors: new Set<string>(), pageViews: 0, durations: [] as number[] },
    ]),
  );

  for (const row of rows) {
    const key = istanbulDayKey(row.created_at);
    const bucket = byDate.get(key);
    if (!bucket) continue;
    bucket.visitors.add(row.visitor_id);
    bucket.pageViews += 1;
    bucket.durations.push(Math.max(0, Number(row.duration_seconds) || 0));
  }

  return days.map((day) => {
    const bucket = byDate.get(day.date)!;
    return {
      date: day.date,
      label: day.label,
      visitors: bucket.visitors.size,
      pageViews: bucket.pageViews,
      avgDurationSeconds: average(bucket.durations) ?? 0,
    };
  });
}

type PageViewRow = {
  visitor_id: string;
  article_id: string | null;
  duration_seconds: number;
  created_at: string;
};

function uniqueCount(values: string[]): number {
  return new Set(values).size;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((acc, n) => acc + n, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

function buildTopArticles(
  rows: PageViewRow[],
  articleMeta: Map<string, { title: string; slug: string }>,
  sortBy: "views" | "time",
  limit = 8,
): DashboardTopArticle[] {
  const byArticle = new Map<
    string,
    { views: number; totalSeconds: number }
  >();

  for (const row of rows) {
    if (!row.article_id) continue;
    const current = byArticle.get(row.article_id) ?? {
      views: 0,
      totalSeconds: 0,
    };
    current.views += 1;
    current.totalSeconds += Math.max(0, Number(row.duration_seconds) || 0);
    byArticle.set(row.article_id, current);
  }

  const list: DashboardTopArticle[] = [];
  for (const [articleId, stats] of byArticle) {
    const meta = articleMeta.get(articleId);
    if (!meta) continue;
    list.push({
      articleId,
      title: meta.title,
      slug: meta.slug,
      views: stats.views,
      totalSeconds: stats.totalSeconds,
      avgSeconds:
        stats.views > 0
          ? Math.round((stats.totalSeconds / stats.views) * 10) / 10
          : 0,
    });
  }

  list.sort((a, b) => {
    if (sortBy === "views") {
      if (b.views !== a.views) return b.views - a.views;
      return b.totalSeconds - a.totalSeconds;
    }
    if (b.totalSeconds !== a.totalSeconds) {
      return b.totalSeconds - a.totalSeconds;
    }
    return b.views - a.views;
  });

  return list.slice(0, limit);
}

async function loadTrafficStats(
  supabase: NonNullable<Awaited<ReturnType<typeof getSafeClient>>>,
  todayStart: string,
  weekStart: string,
): Promise<DashboardTraffic> {
  try {
    const { data, error } = await supabase
      .from("page_views")
      .select("visitor_id, article_id, duration_seconds, created_at")
      .gte("created_at", weekStart)
      .limit(20000);

    if (error || !data) {
      return EMPTY_TRAFFIC;
    }

    const rows = data as PageViewRow[];
    const todayRows = rows.filter((row) => row.created_at >= todayStart);
    const todayDurations = todayRows.map(
      (row) => Math.max(0, Number(row.duration_seconds) || 0),
    );
    const totalDurationToday = todayDurations.reduce((a, b) => a + b, 0);

    const articleIds = [
      ...new Set(
        rows
          .map((row) => row.article_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const articleMeta = new Map<string, { title: string; slug: string }>();
    if (articleIds.length > 0) {
      const { data: articles } = await supabase
        .from("articles")
        .select("id, title, slug")
        .in("id", articleIds.slice(0, 200));

      for (const article of articles ?? []) {
        articleMeta.set(article.id as string, {
          title: String(article.title),
          slug: String(article.slug),
        });
      }
    }

    return {
      visitorsToday: uniqueCount(todayRows.map((r) => r.visitor_id)),
      pageViewsToday: todayRows.length,
      avgDurationTodaySeconds: average(todayDurations),
      totalDurationTodaySeconds: totalDurationToday,
      visitorsLast7Days: uniqueCount(rows.map((r) => r.visitor_id)),
      pageViewsLast7Days: rows.length,
      daily: buildDailySeries(rows, todayStart),
      topByViews: buildTopArticles(rows, articleMeta, "views"),
      topByTime: buildTopArticles(rows, articleMeta, "time"),
    };
  } catch {
    return EMPTY_TRAFFIC;
  }
}

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
      traffic: EMPTY_TRAFFIC,
      pipelineBars: [],
      recentJobRuns: [],
      recentIngestionRuns: [],
      systemStatus: systemStatusBase,
    };
  }

  const { start, endExclusive } = getTodayBoundsIso();
  const weekStart = new Date(
    new Date(start).getTime() - 6 * 24 * 60 * 60 * 1000,
  ).toISOString();

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
      traffic,
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
      loadTrafficStats(supabase, start, weekStart),
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
      traffic,
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
      traffic: EMPTY_TRAFFIC,
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
