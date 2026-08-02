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

/** DiceBear abstract shapes avatar from avatar_seed (no photo-like portraits). */
export function authorAvatarUrl(author: Pick<DbAuthor, "avatar_seed" | "name">): string {
  const params = new URLSearchParams({
    seed: author.avatar_seed || author.name,
    size: "128",
    radius: "50",
    backgroundType: "solid",
    backgroundColor: "e8eef6,d7e4f2,c9d9ec",
    shape1Color: "0b1f3a,1565ef,1d4ed8",
    shape2Color: "64748b,94a3b8,475569",
    shape3Color: "0f172a,1e3a5f,334155",
  });
  return `https://api.dicebear.com/9.x/shapes/svg?${params.toString()}`;
}
