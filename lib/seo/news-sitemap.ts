import { escapeXml } from "@/lib/seo/xml";
import { absolutePublicUrl } from "@/lib/seo/site-url";

export type NewsSitemapArticle = {
  slug: string;
  title: string;
  published_at: string | null;
};

export const NEWS_SITEMAP_MAX = 1000;
export const NEWS_SITEMAP_WINDOW_MS = 48 * 60 * 60 * 1000;

export function isValidPublishedAt(
  value: string | null | undefined,
  now = Date.now(),
): value is string {
  if (!value?.trim()) return false;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return false;
  // Gelecek tarihleri Google News'e alma
  if (time > now + 5 * 60 * 1000) return false;
  return true;
}

export function isWithinNewsWindow(
  publishedAt: string,
  now = Date.now(),
  windowMs = NEWS_SITEMAP_WINDOW_MS,
): boolean {
  const time = Date.parse(publishedAt);
  if (!Number.isFinite(time)) return false;
  return now - time <= windowMs && time <= now + 5 * 60 * 1000;
}

export function filterNewsSitemapArticles(
  articles: NewsSitemapArticle[],
  now = Date.now(),
): NewsSitemapArticle[] {
  return articles
    .filter(
      (article) =>
        Boolean(article.slug?.trim()) &&
        Boolean(article.title?.trim()) &&
        isValidPublishedAt(article.published_at, now) &&
        isWithinNewsWindow(article.published_at!, now),
    )
    .slice(0, NEWS_SITEMAP_MAX);
}

export function buildNewsSitemapXml(
  siteUrl: string,
  articles: NewsSitemapArticle[],
  now = Date.now(),
): string {
  const base = absolutePublicUrl(siteUrl, "/").replace(/\/$/, "");
  const entries = filterNewsSitemapArticles(articles, now);

  const urls = entries
    .map((article) => {
      const loc = escapeXml(`${base}/haber/${article.slug}`);
      const title = escapeXml(article.title.trim());
      const publicationDate = escapeXml(article.published_at!);
      return `  <url>
    <loc>${loc}</loc>
    <news:news>
      <news:publication>
        <news:name>BYTOK AI</news:name>
        <news:language>tr</news:language>
      </news:publication>
      <news:publication_date>${publicationDate}</news:publication_date>
      <news:title>${title}</news:title>
    </news:news>
  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>
`;
}
