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

const FEATURED_SIDE_LIMIT = 3;
const LATEST_LIMIT = 9;

export async function loadHomePageData(): Promise<HomePageData> {
  const dbConfigured = hasSupabaseEnv();

  const [featured, latest, authors, settings, ...rawSections] =
    await Promise.all([
      getFeaturedArticles(FEATURED_SIDE_LIMIT + 1),
      getLatestArticles(LATEST_LIMIT),
      getAuthors(5),
      getSiteSettings(),
      ...HOME_CATEGORY_SLUGS.map((slug) => getCategorySection(slug, 3)),
    ]);

  const lead = featured[0] ?? latest[0] ?? null;

  const featuredSecondary =
    featured.length > 1
      ? featured.slice(1, FEATURED_SIDE_LIMIT + 1)
      : latest
          .filter((article) => article.id !== lead?.id)
          .slice(0, FEATURED_SIDE_LIMIT);

  // Allow overlap with hero / öne çıkanlar so sparse catalogs still fill Son Haberler.
  const latestArticles = latest.slice(0, LATEST_LIMIT);

  const sections: HomeCategorySection[] = HOME_CATEGORY_SLUGS.map(
    (slug, index) => ({
      slug,
      category: rawSections[index]?.category ?? null,
      articles: rawSections[index]?.articles ?? [],
    }),
  ).filter((section) => section.articles.length > 0);

  return {
    dbConfigured,
    lead,
    featuredSecondary,
    latest: latestArticles,
    sections,
    authors,
    settings,
    hasAnyArticles: Boolean(lead) || latestArticles.length > 0,
  };
}
