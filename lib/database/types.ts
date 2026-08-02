/** SQL-aligned domain types for public queries (matches supabase migration). */

export type DbArticleStatus =
  | "draft"
  | "needs_review"
  | "scheduled"
  | "published"
  | "archived"
  | "failed";

export type DbRawArticleStatus =
  | "pending"
  | "processing"
  | "processed"
  | "rejected"
  | "failed"
  | "skipped";

export type DbJobRunStatus = "running" | "success" | "partial" | "failed";

export interface DbAuthor {
  id: string;
  name: string;
  slug: string;
  role: string;
  short_bio: string;
  full_bio: string;
  expertise: string[];
  tone: string;
  writing_rules: string;
  system_prompt: string;
  avatar_seed: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbSource {
  id: string;
  name: string;
  slug: string;
  homepage_url: string;
  section_url: string;
  feed_url: string | null;
  ingestion_type: "rss" | "html" | "manual";
  enabled: boolean;
  priority: number;
  default_language: string;
  last_checked_at: string | null;
  last_success_at: string | null;
  last_error_at: string | null;
  consecutive_failures: number;
  is_unhealthy: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  theme: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DbTag {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface DbArticle {
  id: string;
  raw_article_id: string | null;
  author_id: string | null;
  category_id: string | null;
  title: string;
  slug: string;
  excerpt: string;
  content_markdown: string;
  content_html: string;
  cover_image_url: string | null;
  source_name: string | null;
  source_url: string | null;
  source_published_at: string | null;
  status: DbArticleStatus;
  featured: boolean;
  breaking: boolean;
  ai_generated: boolean;
  ai_model: string | null;
  ai_confidence_score: number | null;
  risk_flags: unknown;
  seo_title: string | null;
  seo_description: string | null;
  reading_time_minutes: number;
  scheduled_at: string | null;
  published_at: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface DbArticleWithRelations extends DbArticle {
  author: DbAuthor | null;
  category: DbCategory | null;
  tags: DbTag[];
}

export interface DbPaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PublicSiteSettings {
  site_name: string;
  site_description: string;
  site_url: string;
  site_tagline: string;
  ai_disclosure_text: string;
  default_og_image: string;
  social_links: {
    x?: string;
    linkedin?: string;
    rss?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
  };
  posts_per_page: number;
  enable_newsletter: boolean;
}

export const DEFAULT_SITE_SETTINGS: PublicSiteSettings = {
  site_name: "BYTOK AI",
  site_description:
    "Yapay zekâ, teknoloji ve dijital dünyanın öne çıkan gelişmeleri. Türkçe, kaynaklı ve bağlamı güçlü haberler.",
  site_url: "https://www.bytokai.com",
  site_tagline: "Yapay zekâ haberleri, kaynaklı ve özgün",
  ai_disclosure_text:
    "Bu içerik yapay zekâ destekli editoryal sistemle hazırlanmıştır. Temel gerçekler belirtilen kaynağa dayanır; metin BYTOK AI tarafından Türkçe ve özgün biçimde yeniden yazılmıştır.",
  default_og_image: "/bytok-ai.png",
  social_links: {
    x: "https://x.com/bytokai",
    linkedin: "https://www.linkedin.com/company/bytok-ai",
    rss: "/rss.xml",
  },
  posts_per_page: 12,
  enable_newsletter: true,
};

export const AUTHOR_PUBLIC_SELECT =
  "id, name, slug, role, short_bio, full_bio, expertise, tone, avatar_seed, active, created_at, updated_at";

export const ARTICLE_LIST_SELECT = `
  id,
  raw_article_id,
  author_id,
  category_id,
  title,
  slug,
  excerpt,
  cover_image_url,
  source_name,
  source_url,
  source_published_at,
  status,
  featured,
  breaking,
  ai_generated,
  ai_model,
  ai_confidence_score,
  risk_flags,
  seo_title,
  seo_description,
  reading_time_minutes,
  scheduled_at,
  published_at,
  view_count,
  created_at,
  updated_at,
  author:authors(${AUTHOR_PUBLIC_SELECT}),
  category:categories(*),
  tags:article_tags(tag:tags(*))
`;

export const ARTICLE_SELECT = `
  *,
  author:authors(${AUTHOR_PUBLIC_SELECT}),
  category:categories(*),
  tags:article_tags(tag:tags(*))
`;

export type ArticleRowWithJoins = Omit<
  DbArticle,
  "content_markdown" | "content_html"
> & {
  content_markdown?: string | null;
  content_html?: string | null;
  author: (Omit<DbAuthor, "writing_rules" | "system_prompt"> & {
    writing_rules?: string;
    system_prompt?: string;
  }) | null;
  category: DbCategory | null;
  tags:
    | Array<{ tag: DbTag | null }>
    | null;
};

export function mapArticleRow(row: ArticleRowWithJoins): DbArticleWithRelations {
  const tags = (row.tags ?? [])
    .map((entry) => entry.tag)
    .filter((tag): tag is DbTag => Boolean(tag));

  const { tags: _tags, author, category, ...rest } = row;
  return {
    ...rest,
    content_markdown: rest.content_markdown ?? "",
    content_html: rest.content_html ?? "",
    author: author
      ? {
          ...author,
          writing_rules: author.writing_rules ?? "",
          system_prompt: author.system_prompt ?? "",
        }
      : null,
    category: category ?? null,
    tags,
  };
}

export function emptyPage<T>(page = 1, pageSize = 12): DbPaginatedResult<T> {
  return {
    items: [],
    total: 0,
    page,
    pageSize,
    totalPages: 0,
  };
}
