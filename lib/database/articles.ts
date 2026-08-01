import "server-only";

import {
  getPublicAnonClient,
  getSafeClient,
} from "@/lib/database/safe-client";
import {
  ARTICLE_SELECT,
  emptyPage,
  mapArticleRow,
  type ArticleRowWithJoins,
  type DbArticleWithRelations,
  type DbPaginatedResult,
} from "@/lib/database/types";

export type {
  DbArticle,
  DbArticleWithRelations,
  DbPaginatedResult,
} from "@/lib/database/types";

const DEFAULT_PAGE_SIZE = 12;

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

export async function getFeaturedArticles(
  limit = 5,
): Promise<DbArticleWithRelations[]> {
  try {
    const supabase = getPublicAnonClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("articles")
      .select(ARTICLE_SELECT)
      .eq("status", "published")
      .eq("featured", true)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error || !data) return [];
    return (data as ArticleRowWithJoins[]).map(mapArticleRow);
  } catch {
    return [];
  }
}

export async function getLatestArticles(
  limit = 12,
  offset = 0,
): Promise<DbArticleWithRelations[]> {
  try {
    const supabase = getPublicAnonClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("articles")
      .select(ARTICLE_SELECT)
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    if (error || !data) return [];
    return (data as ArticleRowWithJoins[]).map(mapArticleRow);
  } catch {
    return [];
  }
}

export async function getPopularArticles(
  limit = 6,
): Promise<DbArticleWithRelations[]> {
  try {
    const supabase = await getSafeClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("articles")
      .select(ARTICLE_SELECT)
      .eq("status", "published")
      .order("view_count", { ascending: false })
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error || !data) return [];
    return (data as ArticleRowWithJoins[]).map(mapArticleRow);
  } catch {
    return [];
  }
}

export async function getArticlesByCategorySlug(
  slug: string,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<DbPaginatedResult<DbArticleWithRelations>> {
  const meta = paginateMeta(0, page, pageSize);
  try {
    const supabase = await getSafeClient();
    if (!supabase) return emptyPage(page, pageSize);

    const { data: category, error: catError } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", slug)
      .eq("active", true)
      .maybeSingle();

    if (catError || !category) return emptyPage(page, pageSize);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from("articles")
      .select(ARTICLE_SELECT, { count: "exact" })
      .eq("status", "published")
      .eq("category_id", category.id)
      .order("published_at", { ascending: false, nullsFirst: false })
      .range(from, to);

    if (error || !data) return emptyPage(page, pageSize);

    return {
      items: (data as ArticleRowWithJoins[]).map(mapArticleRow),
      ...paginateMeta(count ?? 0, page, pageSize),
    };
  } catch {
    return emptyPage(page, pageSize);
  }
}

export async function getArticlesByAuthorSlug(
  slug: string,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<DbPaginatedResult<DbArticleWithRelations>> {
  try {
    const supabase = await getSafeClient();
    if (!supabase) return emptyPage(page, pageSize);

    const { data: author, error: authorError } = await supabase
      .from("authors")
      .select("id")
      .eq("slug", slug)
      .eq("active", true)
      .maybeSingle();

    if (authorError || !author) return emptyPage(page, pageSize);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from("articles")
      .select(ARTICLE_SELECT, { count: "exact" })
      .eq("status", "published")
      .eq("author_id", author.id)
      .order("published_at", { ascending: false, nullsFirst: false })
      .range(from, to);

    if (error || !data) return emptyPage(page, pageSize);

    return {
      items: (data as ArticleRowWithJoins[]).map(mapArticleRow),
      ...paginateMeta(count ?? 0, page, pageSize),
    };
  } catch {
    return emptyPage(page, pageSize);
  }
}

export async function getArticlesByTagSlug(
  slug: string,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<DbPaginatedResult<DbArticleWithRelations>> {
  try {
    const supabase = await getSafeClient();
    if (!supabase) return emptyPage(page, pageSize);

    const { data: tag, error: tagError } = await supabase
      .from("tags")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (tagError || !tag) return emptyPage(page, pageSize);

    const { data: links, error: linkError } = await supabase
      .from("article_tags")
      .select("article_id")
      .eq("tag_id", tag.id);

    if (linkError || !links?.length) return emptyPage(page, pageSize);

    const articleIds = links.map((l) => l.article_id);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from("articles")
      .select(ARTICLE_SELECT, { count: "exact" })
      .eq("status", "published")
      .in("id", articleIds)
      .order("published_at", { ascending: false, nullsFirst: false })
      .range(from, to);

    if (error || !data) return emptyPage(page, pageSize);

    return {
      items: (data as ArticleRowWithJoins[]).map(mapArticleRow),
      ...paginateMeta(count ?? 0, page, pageSize),
    };
  } catch {
    return emptyPage(page, pageSize);
  }
}

export async function getArticleBySlug(
  slug: string,
): Promise<DbArticleWithRelations | null> {
  try {
    const supabase = await getSafeClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("articles")
      .select(ARTICLE_SELECT)
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

    if (error || !data) return null;
    return mapArticleRow(data as ArticleRowWithJoins);
  } catch {
    return null;
  }
}

export async function getRelatedArticles(
  article: DbArticleWithRelations,
  limit = 4,
): Promise<DbArticleWithRelations[]> {
  try {
    const supabase = await getSafeClient();
    if (!supabase) return [];

    let query = supabase
      .from("articles")
      .select(ARTICLE_SELECT)
      .eq("status", "published")
      .neq("id", article.id)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(limit);

    if (article.category_id) {
      query = query.eq("category_id", article.category_id);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    const mapped = (data as ArticleRowWithJoins[]).map(mapArticleRow);
    if (mapped.length >= limit || !article.category_id) {
      return mapped.slice(0, limit);
    }

    const excludeIds = [article.id, ...mapped.map((a) => a.id)];
    const { data: fallback } = await supabase
      .from("articles")
      .select(ARTICLE_SELECT)
      .eq("status", "published")
      .not("id", "in", `(${excludeIds.join(",")})`)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(limit - mapped.length);

    if (!fallback) return mapped;

    const existing = new Set(mapped.map((a) => a.id));
    const extra = (fallback as ArticleRowWithJoins[])
      .map(mapArticleRow)
      .filter((a) => !existing.has(a.id));

    return [...mapped, ...extra].slice(0, limit);
  } catch {
    return [];
  }
}

export async function getAdjacentArticles(
  article: DbArticleWithRelations,
): Promise<{
  prev: DbArticleWithRelations | null;
  next: DbArticleWithRelations | null;
}> {
  try {
    const supabase = await getSafeClient();
    if (!supabase || !article.published_at) {
      return { prev: null, next: null };
    }

    const [{ data: prevData }, { data: nextData }] = await Promise.all([
      supabase
        .from("articles")
        .select(ARTICLE_SELECT)
        .eq("status", "published")
        .lt("published_at", article.published_at)
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("articles")
        .select(ARTICLE_SELECT)
        .eq("status", "published")
        .gt("published_at", article.published_at)
        .order("published_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);

    return {
      prev: prevData
        ? mapArticleRow(prevData as ArticleRowWithJoins)
        : null,
      next: nextData
        ? mapArticleRow(nextData as ArticleRowWithJoins)
        : null,
    };
  } catch {
    return { prev: null, next: null };
  }
}

function escapeIlike(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function quotePostgrest(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export async function searchArticles(
  query: string,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<DbPaginatedResult<DbArticleWithRelations>> {
  const q = query.trim();
  if (!q) return emptyPage(page, pageSize);

  try {
    const supabase = await getSafeClient();
    if (!supabase) return emptyPage(page, pageSize);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const pattern = quotePostgrest(`%${escapeIlike(q)}%`);

    const { data: matchingTags } = await supabase
      .from("tags")
      .select("id")
      .or(`name.ilike.${pattern},slug.ilike.${pattern}`);

    let tagArticleIds: string[] = [];
    if (matchingTags && matchingTags.length > 0) {
      const { data: links } = await supabase
        .from("article_tags")
        .select("article_id")
        .in(
          "tag_id",
          matchingTags.map((tag) => tag.id),
        );

      tagArticleIds = [
        ...new Set((links ?? []).map((link) => link.article_id as string)),
      ];
    }

    const filters = [
      `title.ilike.${pattern}`,
      `excerpt.ilike.${pattern}`,
      `content_markdown.ilike.${pattern}`,
    ];

    if (tagArticleIds.length > 0) {
      filters.push(`id.in.(${tagArticleIds.join(",")})`);
    }

    const { data, error, count } = await supabase
      .from("articles")
      .select(ARTICLE_SELECT, { count: "exact" })
      .eq("status", "published")
      .or(filters.join(","))
      .order("published_at", { ascending: false, nullsFirst: false })
      .range(from, to);

    if (error || !data) return emptyPage(page, pageSize);

    return {
      items: (data as ArticleRowWithJoins[]).map(mapArticleRow),
      ...paginateMeta(count ?? 0, page, pageSize),
    };
  } catch {
    return emptyPage(page, pageSize);
  }
}

export async function getAllPublishedSlugs(): Promise<
  Array<{ slug: string; updated_at: string; published_at: string | null }>
> {
  try {
    const supabase = await getSafeClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("articles")
      .select("slug, updated_at, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false });

    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

export async function getArticlesForRss(
  limit = 50,
): Promise<DbArticleWithRelations[]> {
  return getLatestArticles(limit, 0);
}
