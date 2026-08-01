import "server-only";

import {
  getArticleBySlug,
  getRelatedArticles,
  type DbArticleWithRelations,
} from "@/lib/database/articles";
import {
  getSiteSettings,
  type PublicSiteSettings,
} from "@/lib/database/settings";
import { resolveArticleBodyHtml } from "@/lib/utils/markdown";

export type ArticlePageData = {
  article: DbArticleWithRelations;
  related: DbArticleWithRelations[];
  settings: PublicSiteSettings;
  bodyHtml: string;
  canonicalUrl: string;
};

export async function loadArticlePage(
  slug: string,
): Promise<ArticlePageData | null> {
  const article = await getArticleBySlug(slug);
  if (!article) return null;

  const [related, settings] = await Promise.all([
    getRelatedArticles(article, 4),
    getSiteSettings(),
  ]);

  const bodyHtml = resolveArticleBodyHtml({
    content_html: article.content_html,
    content_markdown: article.content_markdown,
  });

  const base = settings.site_url.replace(/\/$/, "");
  const canonicalUrl = `${base}/haber/${article.slug}`;

  return {
    article,
    related,
    settings,
    bodyHtml,
    canonicalUrl,
  };
}
