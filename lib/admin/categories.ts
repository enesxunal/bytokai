import "server-only";

import { hasSupabaseEnv, getSafeClient } from "@/lib/database/safe-client";
import {
  emptyPage,
  type DbCategory,
  type DbPaginatedResult,
} from "@/lib/database/types";

export const ADMIN_CATEGORIES_PAGE_SIZE = 20;

export type AdminCategoryListItem = DbCategory & {
  article_count: number;
};

export type AdminCategoryFilters = {
  active: boolean | null;
  q: string;
  page: number;
};

export type AdminCategoriesListResult = {
  connected: boolean;
  filters: AdminCategoryFilters;
  result: DbPaginatedResult<AdminCategoryListItem>;
};

export type AdminCategoryRecentArticle = {
  id: string;
  title: string;
  slug: string;
  status: string;
  published_at: string | null;
  created_at: string;
};

export type AdminCategoryDetailResult = {
  connected: boolean;
  category: DbCategory | null;
  articleCount: number;
  recentArticles: AdminCategoryRecentArticle[];
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

export function parseAdminCategorySearchParams(
  params: Record<string, string | string[] | undefined>,
): AdminCategoryFilters {
  const qRaw = firstParam(params.q)?.normalize("NFC") ?? "";
  return {
    active: parseActive(firstParam(params.aktif)),
    q: qRaw.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, 100),
    page: parsePage(firstParam(params.sayfa)),
  };
}

export function buildAdminCategoriesQueryString(
  filters: AdminCategoryFilters,
  page?: number,
): string {
  const sp = new URLSearchParams();
  if (filters.active === true) sp.set("aktif", "evet");
  if (filters.active === false) sp.set("aktif", "hayir");
  if (filters.q) sp.set("q", filters.q);
  const p = page ?? filters.page;
  if (p > 1) sp.set("sayfa", String(p));
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

async function articleCountsForCategories(
  categoryIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (categoryIds.length === 0) return map;

  const supabase = await getSafeClient();
  if (!supabase) return map;

  const { data, error } = await supabase
    .from("articles")
    .select("category_id")
    .in("category_id", categoryIds);

  if (error || !data) return map;

  for (const row of data) {
    const id = row.category_id as string | null;
    if (!id) continue;
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return map;
}

export async function loadAdminCategoriesList(
  searchParams: Record<string, string | string[] | undefined>,
): Promise<AdminCategoriesListResult> {
  const filters = parseAdminCategorySearchParams(searchParams);

  if (!hasSupabaseEnv()) {
    return {
      connected: false,
      filters,
      result: emptyPage(filters.page, ADMIN_CATEGORIES_PAGE_SIZE),
    };
  }

  const supabase = await getSafeClient();
  if (!supabase) {
    return {
      connected: false,
      filters,
      result: emptyPage(filters.page, ADMIN_CATEGORIES_PAGE_SIZE),
    };
  }

  try {
    const from = (filters.page - 1) * ADMIN_CATEGORIES_PAGE_SIZE;
    const to = from + ADMIN_CATEGORIES_PAGE_SIZE - 1;

    let query = supabase.from("categories").select("*", { count: "exact" });

    if (filters.active !== null) {
      query = query.eq("active", filters.active);
    }
    if (filters.q) {
      const pattern = quotePostgrest(`%${escapeIlike(filters.q)}%`);
      query = query.or(
        `name.ilike.${pattern},slug.ilike.${pattern},description.ilike.${pattern},theme.ilike.${pattern},color.ilike.${pattern}`,
      );
    }

    const { data, error, count } = await query
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to);

    if (error || !data) {
      return {
        connected: true,
        filters,
        result: emptyPage(filters.page, ADMIN_CATEGORIES_PAGE_SIZE),
      };
    }

    const categories = data as DbCategory[];
    const counts = await articleCountsForCategories(categories.map((c) => c.id));

    return {
      connected: true,
      filters,
      result: {
        items: categories.map((category) => ({
          ...category,
          article_count: counts.get(category.id) ?? 0,
        })),
        ...paginateMeta(count ?? 0, filters.page, ADMIN_CATEGORIES_PAGE_SIZE),
      },
    };
  } catch {
    return {
      connected: false,
      filters,
      result: emptyPage(filters.page, ADMIN_CATEGORIES_PAGE_SIZE),
    };
  }
}

export async function getAdminCategoryById(
  id: string,
): Promise<{ connected: boolean; category: DbCategory | null }> {
  if (!hasSupabaseEnv()) {
    return { connected: false, category: null };
  }

  const uuid = parseUuid(id);
  if (!uuid) {
    return { connected: true, category: null };
  }

  try {
    const supabase = await getSafeClient();
    if (!supabase) return { connected: false, category: null };

    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("id", uuid)
      .maybeSingle();

    if (error || !data) {
      return { connected: true, category: null };
    }

    return { connected: true, category: data as DbCategory };
  } catch {
    return { connected: false, category: null };
  }
}

export async function loadAdminCategoryDetail(
  id: string,
): Promise<AdminCategoryDetailResult> {
  const { connected, category } = await getAdminCategoryById(id);

  if (!connected) {
    return {
      connected: false,
      category: null,
      articleCount: 0,
      recentArticles: [],
    };
  }

  if (!category) {
    return {
      connected: true,
      category: null,
      articleCount: 0,
      recentArticles: [],
    };
  }

  try {
    const supabase = await getSafeClient();
    if (!supabase) {
      return {
        connected: false,
        category: null,
        articleCount: 0,
        recentArticles: [],
      };
    }

    const [articleCountRes, recentRes] = await Promise.all([
      supabase
        .from("articles")
        .select("id", { count: "exact", head: true })
        .eq("category_id", category.id),
      supabase
        .from("articles")
        .select("id, title, slug, status, published_at, created_at")
        .eq("category_id", category.id)
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    return {
      connected: true,
      category,
      articleCount: articleCountRes.count ?? 0,
      recentArticles: (recentRes.data ?? []) as AdminCategoryRecentArticle[],
    };
  } catch {
    return {
      connected: false,
      category: null,
      articleCount: 0,
      recentArticles: [],
    };
  }
}
