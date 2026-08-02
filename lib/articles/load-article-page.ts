import "server-only";

import { cache } from "react";

import {
  getArticleBySlug,
  getRelatedArticles,
  type DbArticleWithRelations,
} from "@/lib/database/articles";
import {
  getSiteSettings,
  type PublicSiteSettings,
} from "@/lib/database/settings";
import { absolutePublicUrl } from "@/lib/seo/site-url";
import { resolveArticleBodyHtml } from "@/lib/utils/markdown";

export type ArticlePageData = {
  article: DbArticleWithRelations;
  related: DbArticleWithRelations[];
  settings: PublicSiteSettings;
  bodyHtml: string;
  canonicalUrl: string;
};

export const loadArticlePage = cache(async function loadArticlePage(
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

  const canonicalUrl = absolutePublicUrl(
    settings.site_url,
    `/haber/${article.slug}`,
  );

  return {
    article,
    related,
    settings,
    bodyHtml,
    canonicalUrl,
  };
});
