import "server-only";

import { cache } from "react";

import { getPublicAnonClient } from "@/lib/database/safe-client";
import type { DbAuthor } from "@/lib/database/types";
import { AUTHOR_PUBLIC_SELECT } from "@/lib/database/types";

export type { DbAuthor } from "@/lib/database/types";

export const getAuthors = cache(async function getAuthors(
  limit = 24,
): Promise<DbAuthor[]> {
  try {
    const supabase = getPublicAnonClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("authors")
      .select(AUTHOR_PUBLIC_SELECT)
      .eq("active", true)
      .order("name", { ascending: true })
      .limit(limit);

    if (error || !data) return [];
    return data as DbAuthor[];
  } catch {
    return [];
  }
});

export const getAuthorBySlug = cache(async function getAuthorBySlug(
  slug: string,
): Promise<DbAuthor | null> {
  try {
    const supabase = getPublicAnonClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("authors")
      .select(AUTHOR_PUBLIC_SELECT)
      .eq("slug", slug)
      .eq("active", true)
      .maybeSingle();

    if (error || !data) return null;
    return data as DbAuthor;
  } catch {
    return null;
  }
});

export async function getAllAuthorSlugs(): Promise<
  Array<{ slug: string; updated_at: string }>
> {
  try {
    const supabase = getPublicAnonClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("authors")
      .select("slug, updated_at")
      .eq("active", true);

    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

/** DiceBear avatar URL from avatar_seed for personas without uploaded images. */
export function authorAvatarUrl(author: Pick<DbAuthor, "avatar_seed" | "name">): string {
  const seed = encodeURIComponent(author.avatar_seed || author.name);
  return `https://api.dicebear.com/9.x/shapes/svg?seed=${seed}`;
}
