import "server-only";

import { hasSupabaseEnv, getSafeClient } from "@/lib/database/safe-client";
import {
  emptyPage,
  type DbPaginatedResult,
  type DbRawArticleStatus,
  type DbSource,
} from "@/lib/database/types";
import { istanbulWallToUtcIso } from "@/lib/utils/date";

export const ADMIN_RAW_ARTICLES_PAGE_SIZE = 20;

export const RAW_ARTICLE_STATUSES: DbRawArticleStatus[] = [
  "pending",
  "processing",
  "processed",
  "rejected",
  "failed",
  "skipped",
];

/** Kuyruk durumu (şemada "queued" yok; pending kullanılır). */
export const RAW_QUEUE_STATUS: DbRawArticleStatus = "pending";

export const REQUEUEABLE_STATUSES: DbRawArticleStatus[] = [
  "failed",
  "rejected",
  "skipped",
];

const SENSITIVE_KEY_PATTERN =
  /(password|passwd|secret|token|api[_-]?key|authorization|auth|cookie|session|credential|private[_-]?key)/i;

export type AdminRawArticleListItem = {
  id: string;
  source_id: string;
  original_url: string;
  canonical_url: string;
  original_title: string;
  original_published_at: string | null;
  status: DbRawArticleStatus;
  discovered_at: string;
  failure_count: number;
  last_error: string | null;
  source: Pick<DbSource, "id" | "name" | "slug"> | null;
};

export type AdminRawArticleDetail = AdminRawArticleListItem & {
  original_excerpt: string | null;
  original_author: string | null;
  original_image_url: string | null;
  raw_content: string | null;
  raw_payload: unknown;
  content_hash: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
  linked_article: { id: string; title: string; slug: string; status: string } | null;
};

export type AdminRawArticleFilters = {
  status: DbRawArticleStatus | null;
  sourceId: string | null;
  q: string;
  dateFrom: string | null;
  dateTo: string | null;
  hasError: boolean | null;
  page: number;
};

export type AdminRawArticleFilterOptions = {
  sources: Array<Pick<DbSource, "id" | "name">>;
};

export type AdminRawArticlesListResult = {
  connected: boolean;
  filters: AdminRawArticleFilters;
  options: AdminRawArticleFilterOptions;
  result: DbPaginatedResult<AdminRawArticleListItem>;
};

type RawRow = {
  id: string;
  source_id: string;
  original_url: string;
  canonical_url: string;
  original_title: string;
  original_excerpt: string | null;
  original_author: string | null;
  original_published_at: string | null;
  original_image_url: string | null;
  raw_content: string | null;
  raw_payload: unknown;
  content_hash: string | null;
  status: DbRawArticleStatus;
  discovered_at: string;
  processed_at: string | null;
  failure_count: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  source:
    | Pick<DbSource, "id" | "name" | "slug">
    | Pick<DbSource, "id" | "name" | "slug">[]
    | null;
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

function parseStatus(value: string | undefined): DbRawArticleStatus | null {
  if (!value) return null;
  return RAW_ARTICLE_STATUSES.includes(value as DbRawArticleStatus)
    ? (value as DbRawArticleStatus)
    : null;
}

function parseDateOnly(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  return trimmed;
}

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(parsed, 10_000);
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

function dateOnlyStartUtc(dateOnly: string): string {
  const [y, m, d] = dateOnly.split("-").map(Number);
  return istanbulWallToUtcIso(y, m, d, 0, 0, 0);
}

function dateOnlyEndExclusiveUtc(dateOnly: string): string {
  const [y, m, d] = dateOnly.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return istanbulWallToUtcIso(
    next.getUTCFullYear(),
    next.getUTCMonth() + 1,
    next.getUTCDate(),
    0,
    0,
    0,
  );
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

function mapSource(
  source: RawRow["source"],
): Pick<DbSource, "id" | "name" | "slug"> | null {
  if (!source) return null;
  return Array.isArray(source) ? (source[0] ?? null) : source;
}

function mapListItem(row: RawRow): AdminRawArticleListItem {
  return {
    id: row.id,
    source_id: row.source_id,
    original_url: row.original_url,
    canonical_url: row.canonical_url,
    original_title: row.original_title,
    original_published_at: row.original_published_at,
    status: row.status,
    discovered_at: row.discovered_at,
    failure_count: row.failure_count,
    last_error: row.last_error,
    source: mapSource(row.source),
  };
}

export function parseAdminRawArticleSearchParams(
  params: Record<string, string | string[] | undefined>,
): AdminRawArticleFilters {
  const qRaw = firstParam(params.q)?.normalize("NFC") ?? "";
  return {
    status: parseStatus(firstParam(params.durum)),
    sourceId: parseUuid(firstParam(params.kaynak)),
    q: qRaw.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, 100),
    dateFrom: parseDateOnly(firstParam(params.baslangic)),
    dateTo: parseDateOnly(firstParam(params.bitis)),
    hasError: parseHasError(firstParam(params.hata)),
    page: parsePage(firstParam(params.sayfa)),
  };
}

export function buildAdminRawArticlesQueryString(
  filters: AdminRawArticleFilters,
  page?: number,
): string {
  const sp = new URLSearchParams();
  if (filters.status) sp.set("durum", filters.status);
  if (filters.sourceId) sp.set("kaynak", filters.sourceId);
  if (filters.q) sp.set("q", filters.q);
  if (filters.dateFrom) sp.set("baslangic", filters.dateFrom);
  if (filters.dateTo) sp.set("bitis", filters.dateTo);
  if (filters.hasError === true) sp.set("hata", "var");
  if (filters.hasError === false) sp.set("hata", "yok");
  const p = page ?? filters.page;
  if (p > 1) sp.set("sayfa", String(p));
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

/** Hassas anahtarları maskeleyerek JSON güvenli hale getir. */
export function sanitizePayloadForDisplay(
  value: unknown,
  depth = 0,
): unknown {
  if (depth > 6) return "[…]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    return value.length > 500 ? `${value.slice(0, 500)}…` : value;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitizePayloadForDisplay(item, depth + 1));
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    let count = 0;
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (count >= 80) {
        out["…"] = "diğer alanlar gizlendi";
        break;
      }
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        out[key] = "[gizlendi]";
      } else {
        out[key] = sanitizePayloadForDisplay(child, depth + 1);
      }
      count += 1;
    }
    return out;
  }
  return String(value);
}

export function truncateText(
  value: string | null | undefined,
  max = 4000,
): { text: string; truncated: boolean } {
  if (!value) return { text: "", truncated: false };
  if (value.length <= max) return { text: value, truncated: false };
  return { text: `${value.slice(0, max)}…`, truncated: true };
}

const LIST_SELECT = `
  id,
  source_id,
  original_url,
  canonical_url,
  original_title,
  original_published_at,
  status,
  discovered_at,
  failure_count,
  last_error,
  source:sources(id, name, slug)
`;

const DETAIL_SELECT = `
  *,
  source:sources(id, name, slug)
`;

const EMPTY_OPTIONS: AdminRawArticleFilterOptions = { sources: [] };

async function loadSourceOptions(): Promise<AdminRawArticleFilterOptions> {
  const supabase = await getSafeClient();
  if (!supabase) return EMPTY_OPTIONS;
  try {
    const { data } = await supabase
      .from("sources")
      .select("id, name")
      .order("name", { ascending: true });
    return {
      sources: (data ?? []) as AdminRawArticleFilterOptions["sources"],
    };
  } catch {
    return EMPTY_OPTIONS;
  }
}

export async function loadAdminRawArticlesList(
  searchParams: Record<string, string | string[] | undefined>,
): Promise<AdminRawArticlesListResult> {
  const filters = parseAdminRawArticleSearchParams(searchParams);
  const connected = hasSupabaseEnv();

  if (!connected) {
    return {
      connected: false,
      filters,
      options: EMPTY_OPTIONS,
      result: emptyPage(filters.page, ADMIN_RAW_ARTICLES_PAGE_SIZE),
    };
  }

  const options = await loadSourceOptions();
  const supabase = await getSafeClient();
  if (!supabase) {
    return {
      connected: false,
      filters,
      options,
      result: emptyPage(filters.page, ADMIN_RAW_ARTICLES_PAGE_SIZE),
    };
  }

  try {
    const from = (filters.page - 1) * ADMIN_RAW_ARTICLES_PAGE_SIZE;
    const to = from + ADMIN_RAW_ARTICLES_PAGE_SIZE - 1;

    let query = supabase
      .from("raw_articles")
      .select(LIST_SELECT, { count: "exact" });

    if (filters.status) query = query.eq("status", filters.status);
    if (filters.sourceId) query = query.eq("source_id", filters.sourceId);

    if (filters.dateFrom) {
      query = query.gte("discovered_at", dateOnlyStartUtc(filters.dateFrom));
    }
    if (filters.dateTo) {
      query = query.lt("discovered_at", dateOnlyEndExclusiveUtc(filters.dateTo));
    }

    if (filters.hasError === true) {
      query = query.or("failure_count.gt.0,last_error.not.is.null");
    } else if (filters.hasError === false) {
      query = query.eq("failure_count", 0).is("last_error", null);
    }

    if (filters.q) {
      const pattern = quotePostgrest(`%${escapeIlike(filters.q)}%`);
      query = query.or(
        `original_title.ilike.${pattern},original_excerpt.ilike.${pattern},canonical_url.ilike.${pattern},original_url.ilike.${pattern},last_error.ilike.${pattern}`,
      );
    }

    const { data, error, count } = await query
      .order("discovered_at", { ascending: false })
      .range(from, to);

    if (error || !data) {
      return {
        connected: true,
        filters,
        options,
        result: emptyPage(filters.page, ADMIN_RAW_ARTICLES_PAGE_SIZE),
      };
    }

    return {
      connected: true,
      filters,
      options,
      result: {
        items: (data as RawRow[]).map(mapListItem),
        ...paginateMeta(count ?? 0, filters.page, ADMIN_RAW_ARTICLES_PAGE_SIZE),
      },
    };
  } catch {
    return {
      connected: false,
      filters,
      options,
      result: emptyPage(filters.page, ADMIN_RAW_ARTICLES_PAGE_SIZE),
    };
  }
}

export async function getAdminRawArticleById(
  id: string,
): Promise<{ connected: boolean; article: AdminRawArticleDetail | null }> {
  if (!hasSupabaseEnv()) {
    return { connected: false, article: null };
  }

  const uuid = parseUuid(id);
  if (!uuid) {
    return { connected: true, article: null };
  }

  try {
    const supabase = await getSafeClient();
    if (!supabase) return { connected: false, article: null };

    const { data, error } = await supabase
      .from("raw_articles")
      .select(DETAIL_SELECT)
      .eq("id", uuid)
      .maybeSingle();

    if (error || !data) {
      return { connected: true, article: null };
    }

    const row = data as RawRow;
    const { data: linked } = await supabase
      .from("articles")
      .select("id, title, slug, status")
      .eq("raw_article_id", uuid)
      .maybeSingle();

    return {
      connected: true,
      article: {
        ...mapListItem(row),
        original_excerpt: row.original_excerpt,
        original_author: row.original_author,
        original_image_url: row.original_image_url,
        raw_content: row.raw_content,
        raw_payload: row.raw_payload,
        content_hash: row.content_hash,
        processed_at: row.processed_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
        linked_article: linked
          ? {
              id: linked.id as string,
              title: linked.title as string,
              slug: linked.slug as string,
              status: linked.status as string,
            }
          : null,
      },
    };
  } catch {
    return { connected: false, article: null };
  }
}
