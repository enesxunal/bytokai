import "server-only";

import { getPublicAnonClient } from "@/lib/database/safe-client";
import type { DbSource } from "@/lib/database/types";

export type { DbSource } from "@/lib/database/types";

export async function getSources(): Promise<DbSource[]> {
  try {
    const supabase = getPublicAnonClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("sources")
      .select("*")
      .eq("enabled", true)
      .order("priority", { ascending: true })
      .order("name", { ascending: true });

    if (error || !data) return [];
    return data as DbSource[];
  } catch {
    return [];
  }
}

export async function getSourceBySlug(
  slug: string,
): Promise<DbSource | null> {
  try {
    const supabase = getPublicAnonClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("sources")
      .select("*")
      .eq("slug", slug)
      .eq("enabled", true)
      .maybeSingle();

    if (error || !data) return null;
    return data as DbSource;
  } catch {
    return null;
  }
}
