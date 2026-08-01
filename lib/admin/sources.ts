import "server-only";

import { hasSupabaseEnv, getSafeClient } from "@/lib/database/safe-client";
import {
  emptyPage,
  type DbPaginatedResult,
  type DbSource,
} from "@/lib/database/types";

export const ADMIN_SOURCES_PAGE_SIZE = 20;

export type IngestionType = DbSource["ingestion_type"];

export const INGESTION_TYPES: IngestionType[] = ["rss", "html", "manual"];

export const INGESTION_TYPE_LABELS: Record<IngestionType, string> = {
  rss: "RSS",
  html: "HTML",
  manual: "Manuel",
};

export type AdminSourceFilters = {
  enabled: boolean | null;
  ingestionType: IngestionType | null;
  hasError: boolean | null;
  q: string;
  page: number;
};

export type AdminIngestionRun = {
  id: string;
  source_id: string | null;
  started_at: string;
  finished_at: string | null;
  status: "running" | "success" | "partial" | "failed";
  discovered_count: number;
  inserted_count: number;
  duplicate_count: number;
  error_message: string | null;
  metadata: Record<string, unknown>;
};

export type AdminSourcesListResult = {
  connected: boolean;
  filters: AdminSourceFilters;
  result: DbPaginatedResult<DbSource>;
};

export type AdminSourceDetailResult = {
  connected: boolean;
  source: DbSource | null;
  recentRuns: AdminIngestionRun[];
  rawArticleCount: number;
};

function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseUuid(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      trimmed,
    )
  ) {
    return null;
  }
  return trimmed;
}

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(parsed, 10_000);
}

function parseEnabled(value: string | undefined): boolean | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v === "1" || v === "evet" || v === "true" || v === "aktif") return true;
  if (v === "0" || v === "hayir" || v === "false" || v === "pasif") return false;
  return null;
}

function parseIngestionType(value: string | undefined): IngestionType | null {
  if (!value) return null;
  return INGESTION_TYPES.includes(value as IngestionType)
    ? (value as IngestionType)
    : null;
}

function parseHasError(value: string | undefined): boolean | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v === "1" || v === "var" || v === "true" || v === "evet") return true;
  if (v === "0" || v === "yok" || v === "false" || v === "hayir") return false;
  return null;
}

function escapeIlike(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function quotePostgrest(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function paginateMeta(
  total: number,
  page: number,
  pageSize: number,
): Pick<DbPaginatedResult<unknown>, "page" | "pageSize" | "totalPages" | "total"> {
  const safePage = Math.max(1, page);
  const safeSize = Math.max(1, pageSize);
  return {
    total,
    page: safePage,
    pageSize: safeSize,
    totalPages: total === 0 ? 0 : Math.ceil(total / safeSize),
  };
}

export function parseAdminSourceSearchParams(
  params: Record<string, string | string[] | undefined>,
): AdminSourceFilters {
  const qRaw = firstParam(params.q)?.normalize("NFC") ?? "";
  return {
    enabled: parseEnabled(firstParam(params.aktif)),
    ingestionType: parseIngestionType(firstParam(params.tur)),
    hasError: parseHasError(firstParam(params.hata)),
    q: qRaw.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, 100),
    page: parsePage(firstParam(params.sayfa)),
  };
}

export function buildAdminSourcesQueryString(
  filters: AdminSourceFilters,
  page?: number,
): string {
  const sp = new URLSearchParams();
  if (filters.enabled === true) sp.set("aktif", "evet");
  if (filters.enabled === false) sp.set("aktif", "hayir");
  if (filters.ingestionType) sp.set("tur", filters.ingestionType);
  if (filters.hasError === true) sp.set("hata", "var");
  if (filters.hasError === false) sp.set("hata", "yok");
  if (filters.q) sp.set("q", filters.q);
  const p = page ?? filters.page;
  if (p > 1) sp.set("sayfa", String(p));
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export function isSourceProblematic(source: DbSource): boolean {
  return source.is_unhealthy || source.consecutive_failures > 0;
}

export async function loadAdminSourcesList(
  searchParams: Record<string, string | string[] | undefined>,
): Promise<AdminSourcesListResult> {
  const filters = parseAdminSourceSearchParams(searchParams);

  if (!hasSupabaseEnv()) {
    return {
      connected: false,
      filters,
      result: emptyPage(filters.page, ADMIN_SOURCES_PAGE_SIZE),
    };
  }

  const supabase = await getSafeClient();
  if (!supabase) {
    return {
      connected: false,
      filters,
      result: emptyPage(filters.page, ADMIN_SOURCES_PAGE_SIZE),
    };
  }

  try {
    const from = (filters.page - 1) * ADMIN_SOURCES_PAGE_SIZE;
    const to = from + ADMIN_SOURCES_PAGE_SIZE - 1;

    let query = supabase
      .from("sources")
      .select("*", { count: "exact" });

    if (filters.enabled !== null) {
      query = query.eq("enabled", filters.enabled);
    }
    if (filters.ingestionType) {
      query = query.eq("ingestion_type", filters.ingestionType);
    }
    if (filters.hasError === true) {
      query = query.or("is_unhealthy.eq.true,consecutive_failures.gt.0");
    } else if (filters.hasError === false) {
      query = query
        .eq("is_unhealthy", false)
        .eq("consecutive_failures", 0);
    }

    if (filters.q) {
      const pattern = quotePostgrest(`%${escapeIlike(filters.q)}%`);
      query = query.or(
        `name.ilike.${pattern},slug.ilike.${pattern},homepage_url.ilike.${pattern},section_url.ilike.${pattern},feed_url.ilike.${pattern}`,
      );
    }

    const { data, error, count } = await query
      .order("priority", { ascending: true })
      .order("name", { ascending: true })
      .range(from, to);

    if (error || !data) {
      return {
        connected: true,
        filters,
        result: emptyPage(filters.page, ADMIN_SOURCES_PAGE_SIZE),
      };
    }

    return {
      connected: true,
      filters,
      result: {
        items: data as DbSource[],
        ...paginateMeta(count ?? 0, filters.page, ADMIN_SOURCES_PAGE_SIZE),
      },
    };
  } catch {
    return {
      connected: false,
      filters,
      result: emptyPage(filters.page, ADMIN_SOURCES_PAGE_SIZE),
    };
  }
}

export async function getAdminSourceById(
  id: string,
): Promise<{ connected: boolean; source: DbSource | null }> {
  if (!hasSupabaseEnv()) {
    return { connected: false, source: null };
  }

  const uuid = parseUuid(id);
  if (!uuid) {
    return { connected: true, source: null };
  }

  try {
    const supabase = await getSafeClient();
    if (!supabase) return { connected: false, source: null };

    const { data, error } = await supabase
      .from("sources")
      .select("*")
      .eq("id", uuid)
      .maybeSingle();

    if (error || !data) {
      return { connected: true, source: null };
    }

    return { connected: true, source: data as DbSource };
  } catch {
    return { connected: false, source: null };
  }
}

export async function loadAdminSourceDetail(
  id: string,
): Promise<AdminSourceDetailResult> {
  const { connected, source } = await getAdminSourceById(id);

  if (!connected) {
    return {
      connected: false,
      source: null,
      recentRuns: [],
      rawArticleCount: 0,
    };
  }

  if (!source) {
    return {
      connected: true,
      source: null,
      recentRuns: [],
      rawArticleCount: 0,
    };
  }

  try {
    const supabase = await getSafeClient();
    if (!supabase) {
      return {
        connected: false,
        source: null,
        recentRuns: [],
        rawArticleCount: 0,
      };
    }

    const [runsRes, rawCountRes] = await Promise.all([
      supabase
        .from("ingestion_runs")
        .select("*")
        .eq("source_id", source.id)
        .order("started_at", { ascending: false })
        .limit(10),
      supabase
        .from("raw_articles")
        .select("id", { count: "exact", head: true })
        .eq("source_id", source.id),
    ]);

    const recentRuns = ((runsRes.data ?? []) as AdminIngestionRun[]).map(
      (run) => ({
        ...run,
        metadata:
          run.metadata &&
          typeof run.metadata === "object" &&
          !Array.isArray(run.metadata)
            ? (run.metadata as Record<string, unknown>)
            : {},
      }),
    );

    return {
      connected: true,
      source,
      recentRuns,
      rawArticleCount: rawCountRes.count ?? 0,
    };
  } catch {
    return {
      connected: false,
      source: null,
      recentRuns: [],
      rawArticleCount: 0,
    };
  }
}
