import "server-only";

import { cache } from "react";

import { getPublicAnonClient } from "@/lib/database/safe-client";
import type { DbTag } from "@/lib/database/types";

export type { DbTag } from "@/lib/database/types";

export const getTagBySlug = cache(async function getTagBySlug(
  slug: string,
): Promise<DbTag | null> {
  try {
    const supabase = getPublicAnonClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) return null;
    return data as DbTag;
  } catch {
    return null;
  }
});

export async function getPopularTags(limit = 20): Promise<DbTag[]> {
  try {
    const supabase = getPublicAnonClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .order("name", { ascending: true })
      .limit(limit);

    if (error || !data) return [];
    return data as DbTag[];
  } catch {
    return [];
  }
}

export async function getAllTagSlugs(): Promise<
  Array<{ slug: string; created_at: string }>
> {
  try {
    const supabase = getPublicAnonClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("tags")
      .select("slug, created_at");

    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}
