import type { MetadataRoute } from "next";

import { getAllPublishedSlugs } from "@/lib/database/articles";
import { getAllAuthorSlugs } from "@/lib/database/authors";
import { getAllCategorySlugs } from "@/lib/database/categories";
import { getSiteSettings } from "@/lib/database/settings";
import { getAllTagSlugs } from "@/lib/database/tags";
import { absoluteUrl } from "@/lib/listing/helpers";

export const revalidate = 3600;

const STATIC_PATHS: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "hourly", priority: 1 },
  { path: "/hakkimizda", changeFrequency: "monthly", priority: 0.6 },
  { path: "/kaynaklar", changeFrequency: "weekly", priority: 0.6 },
  { path: "/kitap-yayinlat", changeFrequency: "monthly", priority: 0.7 },
  { path: "/editoryal-politika", changeFrequency: "monthly", priority: 0.4 },
  { path: "/gizlilik", changeFrequency: "yearly", priority: 0.3 },
  { path: "/kullanim-kosullari", changeFrequency: "yearly", priority: 0.3 },
];

function toDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await getSiteSettings();
  const base = settings.site_url.replace(/\/$/, "");
  const now = new Date();

  const [articles, categories, authors, tags] = await Promise.all([
    getAllPublishedSlugs(),
    getAllCategorySlugs(),
    getAllAuthorSlugs(),
    getAllTagSlugs(),
  ]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((item) => ({
    url: absoluteUrl(base, item.path),
    lastModified: now,
    changeFrequency: item.changeFrequency,
    priority: item.priority,
  }));

  const articleEntries: MetadataRoute.Sitemap = articles.map((article) => ({
    url: absoluteUrl(base, `/haber/${article.slug}`),
    lastModified:
      toDate(article.updated_at) ?? toDate(article.published_at) ?? now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const categoryEntries: MetadataRoute.Sitemap = categories.map((category) => ({
    url: absoluteUrl(base, `/kategori/${category.slug}`),
    lastModified: toDate(category.updated_at) ?? now,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const authorEntries: MetadataRoute.Sitemap = authors.map((author) => ({
    url: absoluteUrl(base, `/yazar/${author.slug}`),
    lastModified: toDate(author.updated_at) ?? now,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  const tagEntries: MetadataRoute.Sitemap = tags.map((tag) => ({
    url: absoluteUrl(base, `/etiket/${tag.slug}`),
    lastModified: toDate(tag.created_at) ?? now,
    changeFrequency: "weekly",
    priority: 0.4,
  }));

  return [
    ...staticEntries,
    ...articleEntries,
    ...categoryEntries,
    ...authorEntries,
    ...tagEntries,
  ];
}
