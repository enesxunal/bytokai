import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export function hasSupabaseEnv(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return Boolean(url && key);
}

/**
 * Returns a Supabase server client or null when env is missing / client fails.
 * Build and empty-DB scenarios should degrade to empty results.
 */
export async function getSafeClient(): Promise<SupabaseClient | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  try {
    return await createClient();
  } catch {
    return null;
  }
}
