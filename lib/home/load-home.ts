import "server-only";

import {
  getFeaturedArticles,
  getLatestArticles,
  type DbArticleWithRelations,
} from "@/lib/database/articles";
import { getAuthors, type DbAuthor } from "@/lib/database/authors";
import {
  getCategorySection,
  type DbCategory,
} from "@/lib/database/categories";
import { hasSupabaseEnv } from "@/lib/database/safe-client";
import {
  getSiteSettings,
  type PublicSiteSettings,
} from "@/lib/database/settings";

export const HOME_CATEGORY_SLUGS = [
  "yapay-zeka",
  "gelistirici",
  "is-dunyasi",
  "arastirma",
  "yorum",
] as const;

export type HomeCategorySlug = (typeof HOME_CATEGORY_SLUGS)[number];

export type HomeCategorySection = {
  slug: HomeCategorySlug;
  category: DbCategory | null;
  articles: DbArticleWithRelations[];
};

export type HomePageData = {
  dbConfigured: boolean;
  lead: DbArticleWithRelations | null;
  featuredSecondary: DbArticleWithRelations[];
  latest: DbArticleWithRelations[];
  sections: HomeCategorySection[];
  authors: DbAuthor[];
  settings: PublicSiteSettings;
  hasAnyArticles: boolean;
};

export async function loadHomePageData(): Promise<HomePageData> {
  const dbConfigured = hasSupabaseEnv();

  const [featured, latest, authors, settings, ...rawSections] =
    await Promise.all([
      getFeaturedArticles(5),
      getLatestArticles(12),
      getAuthors(6),
      getSiteSettings(),
      ...HOME_CATEGORY_SLUGS.map((slug) => getCategorySection(slug, 4)),
    ]);

  const lead = featured[0] ?? latest[0] ?? null;

  const featuredSecondary =
    featured.length > 1
      ? featured.slice(1)
      : latest.filter((a) => a.id !== lead?.id).slice(0, 4);

  const excludeIds = new Set([
    ...(lead ? [lead.id] : []),
    ...featuredSecondary.map((a) => a.id),
  ]);

  const latestFiltered = latest
    .filter((a) => !excludeIds.has(a.id))
    .slice(0, 8);

  const sections: HomeCategorySection[] = HOME_CATEGORY_SLUGS.map(
    (slug, index) => ({
      slug,
      category: rawSections[index]?.category ?? null,
      articles: rawSections[index]?.articles ?? [],
    }),
  );

  return {
    dbConfigured,
    lead,
    featuredSecondary,
    latest: latestFiltered,
    sections,
    authors,
    settings,
    hasAnyArticles: Boolean(lead) || latest.length > 0,
  };
}
