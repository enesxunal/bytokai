import "server-only";

import { getSafeClient } from "@/lib/database/safe-client";
import type { DbAuthor } from "@/lib/database/types";

export type { DbAuthor } from "@/lib/database/types";

export async function getAuthors(limit = 24): Promise<DbAuthor[]> {
  try {
    const supabase = await getSafeClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("authors")
      .select("*")
      .eq("active", true)
      .order("name", { ascending: true })
      .limit(limit);

    if (error || !data) return [];
    return data as DbAuthor[];
  } catch {
    return [];
  }
}

export async function getAuthorBySlug(
  slug: string,
): Promise<DbAuthor | null> {
  try {
    const supabase = await getSafeClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("authors")
      .select("*")
      .eq("slug", slug)
      .eq("active", true)
      .maybeSingle();

    if (error || !data) return null;
    return data as DbAuthor;
  } catch {
    return null;
  }
}

export async function getAllAuthorSlugs(): Promise<
  Array<{ slug: string; updated_at: string }>
> {
  try {
    const supabase = await getSafeClient();
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
