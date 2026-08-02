import "server-only";

import { hasSupabaseEnv, getSafeClient } from "@/lib/database/safe-client";
import {
  emptyPage,
  mapArticleRow,
  type ArticleRowWithJoins,
  type DbArticleStatus,
  type DbArticleWithRelations,
  type DbAuthor,
  type DbCategory,
  type DbPaginatedResult,
  type DbRawArticleStatus,
  type DbSource,
  type DbTag,
} from "@/lib/database/types";
import {
  istanbulWallToUtcIso,
} from "@/lib/utils/date";

export const ADMIN_ARTICLES_PAGE_SIZE = 20;

export const ADMIN_ARTICLE_SELECT = `
  *,
  author:authors(*),
  category:categories(*),
  tags:article_tags(tag:tags(*)),
  raw_article:raw_articles(
    id,
    source_id,
    original_url,
    canonical_url,
    original_title,
    original_excerpt,
    original_author,
    original_published_at,
    status,
    discovered_at,
    source:sources(id, name, slug)
  )
`;

export type AdminRawArticle = {
  id: string;
  source_id: string;
  original_url: string;
  canonical_url: string;
  original_title: string;
  original_excerpt: string | null;
  original_author: string | null;
  original_published_at: string | null;
  status: DbRawArticleStatus;
  discovered_at: string;
  source: Pick<DbSource, "id" | "name" | "slug"> | null;
};

export type AdminArticleWithRelations = DbArticleWithRelations & {
  raw_article: AdminRawArticle | null;
};

type AdminArticleRow = ArticleRowWithJoins & {
  raw_article:
    | (Omit<AdminRawArticle, "source"> & {
        source:
          | Pick<DbSource, "id" | "name" | "slug">
          | Pick<DbSource, "id" | "name" | "slug">[]
          | null;
      })
    | null;
};

export type AdminArticleFilters = {
  status: DbArticleStatus | null;
  categoryId: string | null;
  authorId: string | null;
  sourceId: string | null;
  q: string;
  dateFrom: string | null;
  dateTo: string | null;
  page: number;
};

export type AdminArticleFilterOptions = {
  categories: Array<Pick<DbCategory, "id" | "name">>;
  authors: Array<Pick<DbAuthor, "id" | "name">>;
  sources: Array<Pick<DbSource, "id" | "name">>;
  tags: Array<Pick<DbTag, "id" | "name" | "slug">>;
};

export type AdminArticlesListResult = {
  connected: boolean;
  filters: AdminArticleFilters;
  options: AdminArticleFilterOptions;
  result: DbPaginatedResult<AdminArticleWithRelations>;
};

const ARTICLE_STATUSES: DbArticleStatus[] = [
  "draft",
  "needs_review",
  "scheduled",
  "published",
  "archived",
  "failed",
];

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

function parseStatus(value: string | undefined): DbArticleStatus | null {
  if (!value) return null;
  return ARTICLE_STATUSES.includes(value as DbArticleStatus)
    ? (value as DbArticleStatus)
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

export function parseAdminArticleSearchParams(
  params: Record<string, string | string[] | undefined>,
): AdminArticleFilters {
  const qRaw = firstParam(params.q)?.normalize("NFC") ?? "";
  return {
    status: parseStatus(firstParam(params.durum)),
    categoryId: parseUuid(firstParam(params.kategori)),
    authorId: parseUuid(firstParam(params.yazar)),
    sourceId: parseUuid(firstParam(params.kaynak)),
    q: qRaw.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, 100),
    dateFrom: parseDateOnly(firstParam(params.baslangic)),
    dateTo: parseDateOnly(firstParam(params.bitis)),
    page: parsePage(firstParam(params.sayfa)),
  };
}

export function buildAdminArticlesQueryString(
  filters: AdminArticleFilters,
  page?: number,
): string {
  const sp = new URLSearchParams();
  if (filters.status) sp.set("durum", filters.status);
  if (filters.categoryId) sp.set("kategori", filters.categoryId);
  if (filters.authorId) sp.set("yazar", filters.authorId);
  if (filters.sourceId) sp.set("kaynak", filters.sourceId);
  if (filters.q) sp.set("q", filters.q);
  if (filters.dateFrom) sp.set("baslangic", filters.dateFrom);
  if (filters.dateTo) sp.set("bitis", filters.dateTo);
  const p = page ?? filters.page;
  if (p > 1) sp.set("sayfa", String(p));
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

function mapAdminArticleRow(row: AdminArticleRow): AdminArticleWithRelations {
  const base = mapArticleRow(row);
  const raw = row.raw_article;
  if (!raw) {
    return { ...base, raw_article: null };
  }

  const source = Array.isArray(raw.source) ? (raw.source[0] ?? null) : raw.source;

  return {
    ...base,
    raw_article: {
      id: raw.id,
      source_id: raw.source_id,
      original_url: raw.original_url,
      canonical_url: raw.canonical_url,
      original_title: raw.original_title,
      original_excerpt: raw.original_excerpt,
      original_author: raw.original_author,
      original_published_at: raw.original_published_at,
      status: raw.status,
      discovered_at: raw.discovered_at,
      source,
    },
  };
}

const EMPTY_OPTIONS: AdminArticleFilterOptions = {
  categories: [],
  authors: [],
  sources: [],
  tags: [],
};

async function loadFilterOptions(): Promise<AdminArticleFilterOptions> {
  const supabase = await getSafeClient();
  if (!supabase) return EMPTY_OPTIONS;

  try {
    const [categoriesRes, authorsRes, sourcesRes, tagsRes] = await Promise.all([
      supabase
        .from("categories")
        .select("id, name")
        .order("sort_order", { ascending: true }),
      supabase.from("authors").select("id, name").order("name", { ascending: true }),
      supabase.from("sources").select("id, name").order("name", { ascending: true }),
      supabase
        .from("tags")
        .select("id, name, slug")
        .order("name", { ascending: true })
        .limit(200),
    ]);

    return {
      categories: (categoriesRes.data ?? []) as AdminArticleFilterOptions["categories"],
      authors: (authorsRes.data ?? []) as AdminArticleFilterOptions["authors"],
      sources: (sourcesRes.data ?? []) as AdminArticleFilterOptions["sources"],
      tags: (tagsRes.data ?? []) as AdminArticleFilterOptions["tags"],
    };
  } catch {
    return EMPTY_OPTIONS;
  }
}

export async function loadAdminArticlesList(
  searchParams: Record<string, string | string[] | undefined>,
): Promise<AdminArticlesListResult> {
  const filters = parseAdminArticleSearchParams(searchParams);
  const connected = hasSupabaseEnv();

  if (!connected) {
    return {
      connected: false,
      filters,
      options: EMPTY_OPTIONS,
      result: emptyPage(filters.page, ADMIN_ARTICLES_PAGE_SIZE),
    };
  }

  const options = await loadFilterOptions();
  const supabase = await getSafeClient();
  if (!supabase) {
    return {
      connected: false,
      filters,
      options,
      result: emptyPage(filters.page, ADMIN_ARTICLES_PAGE_SIZE),
    };
  }

  try {
    let sourceArticleIds: string[] | null = null;
    if (filters.sourceId) {
      const { data: rawRows } = await supabase
        .from("raw_articles")
        .select("id")
        .eq("source_id", filters.sourceId);

      const rawIds = (rawRows ?? []).map((row) => row.id as string);
      const source = options.sources.find((s) => s.id === filters.sourceId);

      const idSet = new Set<string>();
      if (rawIds.length > 0) {
        const { data: linked } = await supabase
          .from("articles")
          .select("id")
          .in("raw_article_id", rawIds);
        for (const row of linked ?? []) idSet.add(row.id as string);
      }

      if (source?.name) {
        const { data: byName } = await supabase
          .from("articles")
          .select("id")
          .eq("source_name", source.name);
        for (const row of byName ?? []) idSet.add(row.id as string);
      }

      sourceArticleIds = [...idSet];
      if (sourceArticleIds.length === 0) {
        return {
          connected: true,
          filters,
          options,
          result: emptyPage(filters.page, ADMIN_ARTICLES_PAGE_SIZE),
        };
      }
    }

    const from = (filters.page - 1) * ADMIN_ARTICLES_PAGE_SIZE;
    const to = from + ADMIN_ARTICLES_PAGE_SIZE - 1;

    let query = supabase
      .from("articles")
      .select(ADMIN_ARTICLE_SELECT, { count: "exact" });

    if (filters.status) query = query.eq("status", filters.status);
    if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
    if (filters.authorId) query = query.eq("author_id", filters.authorId);
    if (sourceArticleIds) query = query.in("id", sourceArticleIds);

    if (filters.dateFrom) {
      query = query.gte("created_at", dateOnlyStartUtc(filters.dateFrom));
    }
    if (filters.dateTo) {
      query = query.lt("created_at", dateOnlyEndExclusiveUtc(filters.dateTo));
    }

    if (filters.q) {
      const pattern = quotePostgrest(`%${escapeIlike(filters.q)}%`);
      query = query.or(
        `title.ilike.${pattern},excerpt.ilike.${pattern},slug.ilike.${pattern},source_name.ilike.${pattern}`,
      );
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error || !data) {
      return {
        connected: true,
        filters,
        options,
        result: emptyPage(filters.page, ADMIN_ARTICLES_PAGE_SIZE),
      };
    }

    return {
      connected: true,
      filters,
      options,
      result: {
        items: (data as AdminArticleRow[]).map(mapAdminArticleRow),
        ...paginateMeta(count ?? 0, filters.page, ADMIN_ARTICLES_PAGE_SIZE),
      },
    };
  } catch {
    return {
      connected: false,
      filters,
      options,
      result: emptyPage(filters.page, ADMIN_ARTICLES_PAGE_SIZE),
    };
  }
}

export async function getAdminArticleById(
  id: string,
): Promise<{ connected: boolean; article: AdminArticleWithRelations | null }> {
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
      .from("articles")
      .select(ADMIN_ARTICLE_SELECT)
      .eq("id", uuid)
      .maybeSingle();

    if (error || !data) {
      return { connected: true, article: null };
    }

    return {
      connected: true,
      article: mapAdminArticleRow(data as AdminArticleRow),
    };
  } catch {
    return { connected: false, article: null };
  }
}

export async function loadAdminArticleEditorData(id: string): Promise<{
  connected: boolean;
  article: AdminArticleWithRelations | null;
  options: AdminArticleFilterOptions;
}> {
  const [{ connected, article }, options] = await Promise.all([
    getAdminArticleById(id),
    loadFilterOptions(),
  ]);

  return { connected, article, options };
}

export async function loadAdminArticleCreateData(): Promise<{
  connected: boolean;
  options: AdminArticleFilterOptions;
}> {
  if (!hasSupabaseEnv()) {
    return { connected: false, options: EMPTY_OPTIONS };
  }

  const options = await loadFilterOptions();
  return { connected: true, options };
}

export function formatRiskFlags(riskFlags: unknown): string[] {
  if (!Array.isArray(riskFlags)) return [];
  return riskFlags
    .map((flag) => (typeof flag === "string" ? flag : String(flag)))
    .filter(Boolean);
}
