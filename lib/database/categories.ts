import "server-only";

import { cache } from "react";

import { getArticlesByCategoryId } from "@/lib/database/articles";
import { getPublicAnonClient } from "@/lib/database/safe-client";
import type { DbArticleWithRelations, DbCategory } from "@/lib/database/types";

export type { DbCategory } from "@/lib/database/types";

export const getCategories = cache(async function getCategories(): Promise<
  DbCategory[]
> {
  try {
    const supabase = getPublicAnonClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true });

    if (error || !data) return [];

    const categories = data as DbCategory[];
    if (categories.length === 0) return [];

    const withPublished = await Promise.all(
      categories.map(async (category) => {
        const { count, error: countError } = await supabase
          .from("articles")
          .select("id", { count: "exact", head: true })
          .eq("status", "published")
          .eq("category_id", category.id);

        if (countError || !count || count < 1) return null;
        return category;
      }),
    );

    return withPublished.filter((category): category is DbCategory =>
      Boolean(category),
    );
  } catch {
    return [];
  }
});

export const getCategoryBySlug = cache(async function getCategoryBySlug(
  slug: string,
): Promise<DbCategory | null> {
  try {
    const supabase = getPublicAnonClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("slug", slug)
      .eq("active", true)
      .maybeSingle();

    if (error || !data) return null;
    return data as DbCategory;
  } catch {
    return null;
  }
});

export async function getCategorySection(
  slug: string,
  limit = 4,
): Promise<{
  category: DbCategory | null;
  articles: DbArticleWithRelations[];
}> {
  try {
    const category = await getCategoryBySlug(slug);
    if (!category) {
      return { category: null, articles: [] };
    }

    const result = await getArticlesByCategoryId(category.id, 1, limit);
    return { category, articles: result.items };
  } catch {
    return { category: null, articles: [] };
  }
}

export async function getAllCategorySlugs(): Promise<
  Array<{ slug: string; updated_at: string }>
> {
  try {
    const supabase = getPublicAnonClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("categories")
      .select("slug, updated_at")
      .eq("active", true);

    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}
