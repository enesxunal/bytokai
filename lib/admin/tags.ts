import "server-only";

import { hasSupabaseEnv, getSafeClient } from "@/lib/database/safe-client";
import {
  emptyPage,
  type DbPaginatedResult,
  type DbTag,
} from "@/lib/database/types";

export const ADMIN_TAGS_PAGE_SIZE = 30;

export type TagUsageFilter = "all" | "used" | "unused";

export type AdminTagListItem = DbTag & {
  article_count: number;
};

export type AdminTagFilters = {
  usage: TagUsageFilter;
  q: string;
  page: number;
};

export type AdminTagsListResult = {
  connected: boolean;
  filters: AdminTagFilters;
  result: DbPaginatedResult<AdminTagListItem>;
};

export type AdminTagRecentArticle = {
  id: string;
  title: string;
  slug: string;
  status: string;
  published_at: string | null;
  created_at: string;
};

export type AdminTagDetailResult = {
  connected: boolean;
  tag: DbTag | null;
  articleCount: number;
  recentArticles: AdminTagRecentArticle[];
};

export type AdminTagMergeOption = {
  id: string;
  name: string;
  slug: string;
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

function parseUsage(value: string | undefined): TagUsageFilter {
  if (!value) return "all";
  const v = value.trim().toLowerCase();
  if (v === "kullanilan" || v === "used" || v === "1") return "used";
  if (v === "kullanilmayan" || v === "unused" || v === "0") return "unused";
  return "all";
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

export function parseAdminTagSearchParams(
  params: Record<string, string | string[] | undefined>,
): AdminTagFilters {
  const qRaw = firstParam(params.q)?.normalize("NFC") ?? "";
  return {
    usage: parseUsage(firstParam(params.kullanim)),
    q: qRaw.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, 100),
    page: parsePage(firstParam(params.sayfa)),
  };
}

export function buildAdminTagsQueryString(
  filters: AdminTagFilters,
  page?: number,
): string {
  const sp = new URLSearchParams();
  if (filters.usage === "used") sp.set("kullanim", "kullanilan");
  if (filters.usage === "unused") sp.set("kullanim", "kullanilmayan");
  if (filters.q) sp.set("q", filters.q);
  const p = page ?? filters.page;
  if (p > 1) sp.set("sayfa", String(p));
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

async function loadUsedTagIds(): Promise<string[] | null> {
  const supabase = await getSafeClient();
  if (!supabase) return null;

  const { data, error } = await supabase.from("article_tags").select("tag_id");
  if (error || !data) return null;

  const ids = new Set<string>();
  for (const row of data) {
    const id = row.tag_id as string | null;
    if (id) ids.add(id);
  }
  return [...ids];
}

async function articleCountsForTags(
  tagIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (tagIds.length === 0) return map;

  const supabase = await getSafeClient();
  if (!supabase) return map;

  const { data, error } = await supabase
    .from("article_tags")
    .select("tag_id")
    .in("tag_id", tagIds);

  if (error || !data) return map;

  for (const row of data) {
    const id = row.tag_id as string | null;
    if (!id) continue;
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return map;
}

export async function loadAdminTagsList(
  searchParams: Record<string, string | string[] | undefined>,
): Promise<AdminTagsListResult> {
  const filters = parseAdminTagSearchParams(searchParams);

  if (!hasSupabaseEnv()) {
    return {
      connected: false,
      filters,
      result: emptyPage(filters.page, ADMIN_TAGS_PAGE_SIZE),
    };
  }

  const supabase = await getSafeClient();
  if (!supabase) {
    return {
      connected: false,
      filters,
      result: emptyPage(filters.page, ADMIN_TAGS_PAGE_SIZE),
    };
  }

  try {
    const from = (filters.page - 1) * ADMIN_TAGS_PAGE_SIZE;
    const to = from + ADMIN_TAGS_PAGE_SIZE - 1;

    let usedIds: string[] | null = null;
    if (filters.usage !== "all") {
      usedIds = await loadUsedTagIds();
      if (usedIds === null) {
        return {
          connected: true,
          filters,
          result: emptyPage(filters.page, ADMIN_TAGS_PAGE_SIZE),
        };
      }
    }

    let query = supabase.from("tags").select("*", { count: "exact" });

    if (filters.usage === "used") {
      if (usedIds!.length === 0) {
        return {
          connected: true,
          filters,
          result: emptyPage(filters.page, ADMIN_TAGS_PAGE_SIZE),
        };
      }
      query = query.in("id", usedIds!);
    } else if (filters.usage === "unused") {
      if (usedIds!.length > 0) {
        query = query.not("id", "in", `(${usedIds!.join(",")})`);
      }
    }

    if (filters.q) {
      const pattern = quotePostgrest(`%${escapeIlike(filters.q)}%`);
      query = query.or(`name.ilike.${pattern},slug.ilike.${pattern}`);
    }

    const { data, error, count } = await query
      .order("name", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to);

    if (error || !data) {
      return {
        connected: true,
        filters,
        result: emptyPage(filters.page, ADMIN_TAGS_PAGE_SIZE),
      };
    }

    const tags = data as DbTag[];
    const counts = await articleCountsForTags(tags.map((t) => t.id));

    return {
      connected: true,
      filters,
      result: {
        items: tags.map((tag) => ({
          ...tag,
          article_count: counts.get(tag.id) ?? 0,
        })),
        ...paginateMeta(count ?? 0, filters.page, ADMIN_TAGS_PAGE_SIZE),
      },
    };
  } catch {
    return {
      connected: false,
      filters,
      result: emptyPage(filters.page, ADMIN_TAGS_PAGE_SIZE),
    };
  }
}

export async function getAdminTagById(
  id: string,
): Promise<{ connected: boolean; tag: DbTag | null }> {
  if (!hasSupabaseEnv()) {
    return { connected: false, tag: null };
  }

  const uuid = parseUuid(id);
  if (!uuid) {
    return { connected: true, tag: null };
  }

  try {
    const supabase = await getSafeClient();
    if (!supabase) return { connected: false, tag: null };

    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .eq("id", uuid)
      .maybeSingle();

    if (error || !data) {
      return { connected: true, tag: null };
    }

    return { connected: true, tag: data as DbTag };
  } catch {
    return { connected: false, tag: null };
  }
}

export async function loadAdminTagDetail(
  id: string,
): Promise<AdminTagDetailResult> {
  const { connected, tag } = await getAdminTagById(id);

  if (!connected) {
    return {
      connected: false,
      tag: null,
      articleCount: 0,
      recentArticles: [],
    };
  }

  if (!tag) {
    return {
      connected: true,
      tag: null,
      articleCount: 0,
      recentArticles: [],
    };
  }

  try {
    const supabase = await getSafeClient();
    if (!supabase) {
      return {
        connected: false,
        tag: null,
        articleCount: 0,
        recentArticles: [],
      };
    }

    const [countRes, linksRes] = await Promise.all([
      supabase
        .from("article_tags")
        .select("article_id", { count: "exact", head: true })
        .eq("tag_id", tag.id),
      supabase
        .from("article_tags")
        .select("article_id")
        .eq("tag_id", tag.id)
        .limit(50),
    ]);

    const articleIds = (linksRes.data ?? [])
      .map((row) => row.article_id as string)
      .filter(Boolean);

    let recentArticles: AdminTagRecentArticle[] = [];
    if (articleIds.length > 0) {
      const { data: articles } = await supabase
        .from("articles")
        .select("id, title, slug, status, published_at, created_at")
        .in("id", articleIds)
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(10);

      recentArticles = (articles ?? []) as AdminTagRecentArticle[];
    }

    return {
      connected: true,
      tag,
      articleCount: countRes.count ?? 0,
      recentArticles,
    };
  } catch {
    return {
      connected: false,
      tag: null,
      articleCount: 0,
      recentArticles: [],
    };
  }
}

export async function loadTagMergeOptions(
  excludeId: string,
): Promise<{ connected: boolean; options: AdminTagMergeOption[] }> {
  if (!hasSupabaseEnv()) {
    return { connected: false, options: [] };
  }

  const uuid = parseUuid(excludeId);
  if (!uuid) {
    return { connected: true, options: [] };
  }

  try {
    const supabase = await getSafeClient();
    if (!supabase) return { connected: false, options: [] };

    const { data, error } = await supabase
      .from("tags")
      .select("id, name, slug")
      .neq("id", uuid)
      .order("name", { ascending: true })
      .limit(500);

    if (error || !data) {
      return { connected: true, options: [] };
    }

    return {
      connected: true,
      options: data as AdminTagMergeOption[],
    };
  } catch {
    return { connected: false, options: [] };
  }
}
