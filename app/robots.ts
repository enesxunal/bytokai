import type { MetadataRoute } from "next";

import { getSiteSettings } from "@/lib/database/settings";
import { absoluteUrl } from "@/lib/listing/helpers";

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
    sitemap: absoluteUrl(base, "/sitemap.xml"),
    host: base.replace(/^https?:\/\//, ""),
  };
}
