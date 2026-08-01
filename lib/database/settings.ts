import "server-only";

import { getSafeClient } from "@/lib/database/safe-client";
import {
  DEFAULT_SITE_SETTINGS,
  type PublicSiteSettings,
} from "@/lib/database/types";

export type { PublicSiteSettings } from "@/lib/database/types";
export { DEFAULT_SITE_SETTINGS } from "@/lib/database/types";

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asSocial(
  value: unknown,
  fallback: PublicSiteSettings["social_links"],
): PublicSiteSettings["social_links"] {
  if (!value || typeof value !== "object") return fallback;
  const obj = value as Record<string, unknown>;
  return {
    x: typeof obj.x === "string" ? obj.x : fallback.x,
    linkedin: typeof obj.linkedin === "string" ? obj.linkedin : fallback.linkedin,
    rss: typeof obj.rss === "string" ? obj.rss : fallback.rss,
    twitter: typeof obj.twitter === "string" ? obj.twitter : fallback.twitter,
    instagram:
      typeof obj.instagram === "string" ? obj.instagram : fallback.instagram,
    youtube: typeof obj.youtube === "string" ? obj.youtube : fallback.youtube,
  };
}

export async function getSiteSettings(): Promise<PublicSiteSettings> {
  try {
    const supabase = await getSafeClient();
    if (!supabase) return { ...DEFAULT_SITE_SETTINGS };

    const { data, error } = await supabase.from("site_settings").select("key, value");

    if (error || !data) return { ...DEFAULT_SITE_SETTINGS };

    const map = new Map<string, unknown>();
    for (const row of data) {
      map.set(row.key, row.value);
    }

    const siteUrl = asString(
      map.get("site_url"),
      process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_SETTINGS.site_url,
    );

    return {
      site_name: asString(map.get("site_name"), DEFAULT_SITE_SETTINGS.site_name),
      site_description: asString(
        map.get("site_description"),
        DEFAULT_SITE_SETTINGS.site_description,
      ),
      site_url: siteUrl,
      site_tagline: asString(
        map.get("site_tagline"),
        DEFAULT_SITE_SETTINGS.site_tagline,
      ),
      ai_disclosure_text: asString(
        map.get("ai_disclosure_text"),
        DEFAULT_SITE_SETTINGS.ai_disclosure_text,
      ),
      default_og_image: asString(
        map.get("default_og_image"),
        DEFAULT_SITE_SETTINGS.default_og_image,
      ),
      social_links: asSocial(
        map.get("social_links"),
        DEFAULT_SITE_SETTINGS.social_links,
      ),
      posts_per_page: asNumber(
        map.get("posts_per_page"),
        DEFAULT_SITE_SETTINGS.posts_per_page,
      ),
      enable_newsletter: asBoolean(
        map.get("enable_newsletter"),
        DEFAULT_SITE_SETTINGS.enable_newsletter,
      ),
    };
  } catch {
    return { ...DEFAULT_SITE_SETTINGS };
  }
}

export async function getSettingValue<T = unknown>(
  key: string,
  fallback: T,
): Promise<T> {
  try {
    const supabase = await getSafeClient();
    if (!supabase) return fallback;

    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();

    if (error || !data) return fallback;
    return (data.value as T) ?? fallback;
  } catch {
    return fallback;
  }
}
