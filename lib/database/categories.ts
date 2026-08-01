import "server-only";

import { getSafeClient } from "@/lib/database/safe-client";
import type { DbCategory } from "@/lib/database/types";
import { getArticlesByCategorySlug } from "@/lib/database/articles";
import type { DbArticleWithRelations } from "@/lib/database/types";

export type { DbCategory } from "@/lib/database/types";

export async function getCategories(): Promise<DbCategory[]> {
  try {
    const supabase = await getSafeClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true });

    if (error || !data) return [];
    return data as DbCategory[];
  } catch {
    return [];
  }
}

export async function getCategoryBySlug(
  slug: string,
): Promise<DbCategory | null> {
  try {
    const supabase = await getSafeClient();
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
}

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

    const result = await getArticlesByCategorySlug(slug, 1, limit);
    return { category, articles: result.items };
  } catch {
    return { category: null, articles: [] };
  }
}

export async function getAllCategorySlugs(): Promise<
  Array<{ slug: string; updated_at: string }>
> {
  try {
    const supabase = await getSafeClient();
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
