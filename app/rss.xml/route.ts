import { getArticlesForRss } from "@/lib/database/articles";
import { getSiteSettings } from "@/lib/database/settings";
import { buildRssXml } from "@/lib/seo/rss";
import { xmlResponse } from "@/lib/seo/xml";

export const revalidate = 600;

export async function GET() {
  try {
    const [settings, articles] = await Promise.all([
      getSiteSettings(),
      getArticlesForRss(50),
    ]);

    const xml = buildRssXml({
      siteUrl: settings.site_url,
      siteName: settings.site_name,
      siteDescription: settings.site_description,
      articles: articles.map((article) => ({
        slug: article.slug,
        title: article.title,
        excerpt: article.excerpt,
        published_at: article.published_at,
        authorName: article.author?.name ?? null,
        categoryName: article.category?.name ?? null,
        sourceName: article.source_name,
        sourceUrl: article.source_url,
      })),
    });

    return xmlResponse(xml, {
      contentType: "application/rss+xml; charset=utf-8",
      revalidateSeconds: 600,
    });
  } catch {
    const empty = buildRssXml({
      siteUrl: "https://www.bytokai.com",
      siteName: "BYTOK AI",
      siteDescription: "Yapay zekâ haberleri",
      articles: [],
    });
    return xmlResponse(empty, {
      contentType: "application/rss+xml; charset=utf-8",
      revalidateSeconds: 60,
    });
  }
}
