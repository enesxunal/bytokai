import "server-only";

import {
  getFeaturedArticles,
  getLatestArticles,
  type DbArticleWithRelations,
} from "@/lib/database/articles";
import { getAuthors, type DbAuthor } from "@/lib/database/authors";
import {
  getCategories,
  getCategorySection,
  type DbCategory,
} from "@/lib/database/categories";
import { hasSupabaseEnv } from "@/lib/database/safe-client";
import {
  getSiteSettings,
  type PublicSiteSettings,
} from "@/lib/database/settings";

export type HomeCategorySection = {
  slug: string;
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
const SECTION_ARTICLE_LIMIT = 3;

export async function loadHomePageData(): Promise<HomePageData> {
  const dbConfigured = hasSupabaseEnv();

  const [featured, latest, authors, settings, categories] = await Promise.all([
    getFeaturedArticles(FEATURED_SIDE_LIMIT + 1),
    getLatestArticles(LATEST_LIMIT),
    getAuthors(5),
    getSiteSettings(),
    getCategories(),
  ]);

  const rawSections = await Promise.all(
    categories.map((category) =>
      getCategorySection(category.slug, SECTION_ARTICLE_LIMIT),
    ),
  );

  const lead = featured[0] ?? latest[0] ?? null;

  const featuredSecondary =
    featured.length > 1
      ? featured.slice(1, FEATURED_SIDE_LIMIT + 1)
      : latest
          .filter((article) => article.id !== lead?.id)
          .slice(0, FEATURED_SIDE_LIMIT);

  // Allow overlap with hero / öne çıkanlar so sparse catalogs still fill Son Haberler.
  const latestArticles = latest.slice(0, LATEST_LIMIT);

  const sections: HomeCategorySection[] = categories
    .map((category, index) => ({
      slug: category.slug,
      category: rawSections[index]?.category ?? category,
      articles: rawSections[index]?.articles ?? [],
    }))
    .filter((section) => section.articles.length > 0);

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
