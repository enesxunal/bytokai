import "server-only";

import { hasSupabaseEnv, getSafeClient } from "@/lib/database/safe-client";
import {
  emptyPage,
  type DbAuthor,
  type DbPaginatedResult,
} from "@/lib/database/types";

export const ADMIN_AUTHORS_PAGE_SIZE = 20;

export type AdminAuthorListItem = DbAuthor & {
  published_count: number;
};

export type AdminAuthorFilters = {
  active: boolean | null;
  role: string | null;
  q: string;
  page: number;
};

export type AdminAuthorFilterOptions = {
  roles: string[];
};

export type AdminAuthorsListResult = {
  connected: boolean;
  filters: AdminAuthorFilters;
  options: AdminAuthorFilterOptions;
  result: DbPaginatedResult<AdminAuthorListItem>;
};

export type AdminAuthorRecentArticle = {
  id: string;
  title: string;
  slug: string;
  status: string;
  published_at: string | null;
  created_at: string;
};

export type AdminAuthorDetailResult = {
  connected: boolean;
  author: DbAuthor | null;
  publishedCount: number;
  articleCount: number;
  recentArticles: AdminAuthorRecentArticle[];
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

function parseActive(value: string | undefined): boolean | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v === "1" || v === "evet" || v === "true" || v === "aktif") return true;
  if (v === "0" || v === "hayir" || v === "false" || v === "pasif") return false;
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

export function parseAdminAuthorSearchParams(
  params: Record<string, string | string[] | undefined>,
): AdminAuthorFilters {
  const qRaw = firstParam(params.q)?.normalize("NFC") ?? "";
  const roleRaw = firstParam(params.rol)?.normalize("NFC") ?? "";
  return {
    active: parseActive(firstParam(params.aktif)),
    role: roleRaw.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, 120) || null,
    q: qRaw.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, 100),
    page: parsePage(firstParam(params.sayfa)),
  };
}

export function buildAdminAuthorsQueryString(
  filters: AdminAuthorFilters,
  page?: number,
): string {
  const sp = new URLSearchParams();
  if (filters.active === true) sp.set("aktif", "evet");
  if (filters.active === false) sp.set("aktif", "hayir");
  if (filters.role) sp.set("rol", filters.role);
  if (filters.q) sp.set("q", filters.q);
  const p = page ?? filters.page;
  if (p > 1) sp.set("sayfa", String(p));
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

/** Form alanı (virgül / satır) → text[] */
export function parseExpertiseInput(raw: string): string[] {
  const seen = new Set<string>();
  const items: string[] = [];
  for (const part of raw.split(/[,;\n]/)) {
    const name = part.trim().replace(/\s+/g, " ");
    if (!name || name.length > 80) continue;
    const key = name.toLocaleLowerCase("tr-TR");
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(name);
    if (items.length >= 30) break;
  }
  return items;
}

export function formatExpertiseInput(expertise: string[]): string {
  return expertise.join(", ");
}

async function loadRoleOptions(): Promise<string[]> {
  const supabase = await getSafeClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("authors")
      .select("role")
      .order("role", { ascending: true });

    if (error || !data) return [];

    const roles = new Set<string>();
    for (const row of data) {
      const role = typeof row.role === "string" ? row.role.trim() : "";
      if (role) roles.add(role);
    }
    return [...roles].sort((a, b) => a.localeCompare(b, "tr"));
  } catch {
    return [];
  }
}

async function publishedCountsForAuthors(
  authorIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (authorIds.length === 0) return map;

  const supabase = await getSafeClient();
  if (!supabase) return map;

  const { data, error } = await supabase
    .from("articles")
    .select("author_id")
    .eq("status", "published")
    .in("author_id", authorIds);

  if (error || !data) return map;

  for (const row of data) {
    const id = row.author_id as string | null;
    if (!id) continue;
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return map;
}

export async function loadAdminAuthorsList(
  searchParams: Record<string, string | string[] | undefined>,
): Promise<AdminAuthorsListResult> {
  const filters = parseAdminAuthorSearchParams(searchParams);

  if (!hasSupabaseEnv()) {
    return {
      connected: false,
      filters,
      options: { roles: [] },
      result: emptyPage(filters.page, ADMIN_AUTHORS_PAGE_SIZE),
    };
  }

  const supabase = await getSafeClient();
  if (!supabase) {
    return {
      connected: false,
      filters,
      options: { roles: [] },
      result: emptyPage(filters.page, ADMIN_AUTHORS_PAGE_SIZE),
    };
  }

  try {
    const options = { roles: await loadRoleOptions() };
    const from = (filters.page - 1) * ADMIN_AUTHORS_PAGE_SIZE;
    const to = from + ADMIN_AUTHORS_PAGE_SIZE - 1;

    let query = supabase.from("authors").select("*", { count: "exact" });

    if (filters.active !== null) {
      query = query.eq("active", filters.active);
    }
    if (filters.role) {
      query = query.eq("role", filters.role);
    }
    if (filters.q) {
      const pattern = quotePostgrest(`%${escapeIlike(filters.q)}%`);
      query = query.or(
        `name.ilike.${pattern},slug.ilike.${pattern},role.ilike.${pattern},short_bio.ilike.${pattern},tone.ilike.${pattern}`,
      );
    }

    const { data, error, count } = await query
      .order("name", { ascending: true })
      .range(from, to);

    if (error || !data) {
      return {
        connected: true,
        filters,
        options,
        result: emptyPage(filters.page, ADMIN_AUTHORS_PAGE_SIZE),
      };
    }

    const authors = data as DbAuthor[];
    const counts = await publishedCountsForAuthors(authors.map((a) => a.id));

    return {
      connected: true,
      filters,
      options,
      result: {
        items: authors.map((author) => ({
          ...author,
          published_count: counts.get(author.id) ?? 0,
        })),
        ...paginateMeta(count ?? 0, filters.page, ADMIN_AUTHORS_PAGE_SIZE),
      },
    };
  } catch {
    return {
      connected: false,
      filters,
      options: { roles: [] },
      result: emptyPage(filters.page, ADMIN_AUTHORS_PAGE_SIZE),
    };
  }
}

export async function getAdminAuthorById(
  id: string,
): Promise<{ connected: boolean; author: DbAuthor | null }> {
  if (!hasSupabaseEnv()) {
    return { connected: false, author: null };
  }

  const uuid = parseUuid(id);
  if (!uuid) {
    return { connected: true, author: null };
  }

  try {
    const supabase = await getSafeClient();
    if (!supabase) return { connected: false, author: null };

    const { data, error } = await supabase
      .from("authors")
      .select("*")
      .eq("id", uuid)
      .maybeSingle();

    if (error || !data) {
      return { connected: true, author: null };
    }

    return { connected: true, author: data as DbAuthor };
  } catch {
    return { connected: false, author: null };
  }
}

export async function loadAdminAuthorDetail(
  id: string,
): Promise<AdminAuthorDetailResult> {
  const { connected, author } = await getAdminAuthorById(id);

  if (!connected) {
    return {
      connected: false,
      author: null,
      publishedCount: 0,
      articleCount: 0,
      recentArticles: [],
    };
  }

  if (!author) {
    return {
      connected: true,
      author: null,
      publishedCount: 0,
      articleCount: 0,
      recentArticles: [],
    };
  }

  try {
    const supabase = await getSafeClient();
    if (!supabase) {
      return {
        connected: false,
        author: null,
        publishedCount: 0,
        articleCount: 0,
        recentArticles: [],
      };
    }

    const [publishedCountRes, articleCountRes, recentRes] = await Promise.all([
      supabase
        .from("articles")
        .select("id", { count: "exact", head: true })
        .eq("author_id", author.id)
        .eq("status", "published"),
      supabase
        .from("articles")
        .select("id", { count: "exact", head: true })
        .eq("author_id", author.id),
      supabase
        .from("articles")
        .select("id, title, slug, status, published_at, created_at")
        .eq("author_id", author.id)
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    return {
      connected: true,
      author,
      publishedCount: publishedCountRes.count ?? 0,
      articleCount: articleCountRes.count ?? 0,
      recentArticles: (recentRes.data ?? []) as AdminAuthorRecentArticle[],
    };
  } catch {
    return {
      connected: false,
      author: null,
      publishedCount: 0,
      articleCount: 0,
      recentArticles: [],
    };
  }
}
