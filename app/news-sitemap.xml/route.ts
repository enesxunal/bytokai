import { getPublishedArticlesForNewsSitemap } from "@/lib/database/articles";
import { getSiteSettings } from "@/lib/database/settings";
import { buildNewsSitemapXml } from "@/lib/seo/news-sitemap";
import { xmlResponse } from "@/lib/seo/xml";

export const revalidate = 300;

export async function GET() {
  try {
    const settings = await getSiteSettings();
    const articles = await getPublishedArticlesForNewsSitemap(1000);
    const xml = buildNewsSitemapXml(settings.site_url, articles);
    return xmlResponse(xml, {
      contentType: "application/xml; charset=utf-8",
      revalidateSeconds: 300,
    });
  } catch {
    const empty = buildNewsSitemapXml("https://www.bytokai.com", []);
    return xmlResponse(empty, {
      contentType: "application/xml; charset=utf-8",
      revalidateSeconds: 60,
    });
  }
}
