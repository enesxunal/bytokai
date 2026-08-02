import type { MetadataRoute } from "next";

import { getSiteSettings } from "@/lib/database/settings";
import { absolutePublicUrl } from "@/lib/seo/site-url";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSiteSettings();
  const base = settings.site_url.replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/arama"],
      },
    ],
    sitemap: [
      absolutePublicUrl(base, "/sitemap.xml"),
      absolutePublicUrl(base, "/news-sitemap.xml"),
    ],
    host: "www.bytokai.com",
  };
}
