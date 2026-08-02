import { escapeXml } from "@/lib/seo/xml";
import { absolutePublicUrl } from "@/lib/seo/site-url";

export type RssArticleInput = {
  slug: string;
  title: string;
  excerpt: string | null;
  published_at: string | null;
  authorName?: string | null;
  categoryName?: string | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
};

export function toRssPubDate(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toUTCString();
}

export function buildRssXml(input: {
  siteUrl: string;
  siteName: string;
  siteDescription: string;
  articles: RssArticleInput[];
}): string {
  const base = absolutePublicUrl(input.siteUrl, "/").replace(/\/$/, "");
  const channelLink = escapeXml(base);
  const channelTitle = escapeXml(input.siteName);
  const channelDescription = escapeXml(input.siteDescription);

  const items = input.articles
    .filter(
      (article) =>
        article.slug?.trim() &&
        article.title?.trim() &&
        article.published_at &&
        toRssPubDate(article.published_at),
    )
    .map((article) => {
      const link = escapeXml(`${base}/haber/${article.slug}`);
      const title = escapeXml(article.title.trim());
      const description = escapeXml(
        (article.excerpt?.trim() || article.title).trim(),
      );
      const pubDate = escapeXml(toRssPubDate(article.published_at!)!);
      const author = article.authorName?.trim()
        ? `\n      <author>${escapeXml(article.authorName.trim())}</author>`
        : "";
      const category = article.categoryName?.trim()
        ? `\n      <category>${escapeXml(article.categoryName.trim())}</category>`
        : "";
      const source =
        article.sourceName?.trim() && article.sourceUrl?.trim()
          ? `\n      <source url="${escapeXml(article.sourceUrl.trim())}">${escapeXml(article.sourceName.trim())}</source>`
          : article.sourceName?.trim()
            ? `\n      <source>${escapeXml(article.sourceName.trim())}</source>`
            : "";

      return `    <item>
      <title>${title}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${description}</description>${author}${category}${source}
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${channelTitle}</title>
    <link>${channelLink}</link>
    <description>${channelDescription}</description>
    <language>tr</language>
    <lastBuildDate>${escapeXml(new Date().toUTCString())}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}
