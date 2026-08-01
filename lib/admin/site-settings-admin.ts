"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  failResult,
  okResult,
  toActionError,
  zodFieldErrors,
  type ActionResult,
} from "@/lib/admin/action-result";
import { writeAuditLog } from "@/lib/admin/audit";
import { requireAdminAction } from "@/lib/auth/session";
import { hasSupabaseEnv, getSafeClient } from "@/lib/database/safe-client";
import {
  DEFAULT_SITE_SETTINGS,
  type PublicSiteSettings,
} from "@/lib/database/types";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("admin.site-settings");

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) =>
      value === "" ||
      value.startsWith("/") ||
      /^https?:\/\//i.test(value),
    "Geçerli bir URL veya yol girin",
  );

const siteSettingsFormSchema = z.object({
  site_name: z
    .string()
    .trim()
    .min(1, "Site adı gerekli")
    .max(120, "Site adı en fazla 120 karakter olabilir"),
  site_description: z
    .string()
    .trim()
    .min(1, "Site açıklaması gerekli")
    .max(500, "Site açıklaması en fazla 500 karakter olabilir"),
  site_url: z
    .string()
    .trim()
    .url("Geçerli bir site URL’si girin")
    .max(300),
  default_og_image: z
    .string()
    .trim()
    .min(1, "Varsayılan SEO görseli gerekli")
    .max(500)
    .refine(
      (value) => value.startsWith("/") || /^https?:\/\//i.test(value),
      "Görsel yolu / ile veya https:// ile başlamalı",
    ),
  ai_disclosure_text: z
    .string()
    .trim()
    .min(1, "AI açıklama metni gerekli")
    .max(2000, "AI açıklama metni en fazla 2000 karakter olabilir"),
  social_x: optionalUrl,
  social_linkedin: optionalUrl,
  social_rss: optionalUrl,
});

export type SiteSettingsFormInput = z.infer<typeof siteSettingsFormSchema>;

const SITE_SETTINGS_FORM_KEYS = [
  "site_name",
  "site_description",
  "site_url",
  "default_og_image",
  "ai_disclosure_text",
  "social_links",
] as const;

export type AdminSiteSettingsPageData = {
  connected: boolean;
  settingsKnown: boolean;
  settings: SiteSettingsFormInput;
  updatedAt: string | null;
};

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asSocial(value: unknown): PublicSiteSettings["social_links"] {
  const fallback = DEFAULT_SITE_SETTINGS.social_links;
  if (!value || typeof value !== "object") return { ...fallback };
  const obj = value as Record<string, unknown>;
  return {
    x: typeof obj.x === "string" ? obj.x : fallback.x,
    linkedin: typeof obj.linkedin === "string" ? obj.linkedin : fallback.linkedin,
    rss: typeof obj.rss === "string" ? obj.rss : fallback.rss,
  };
}

function mapToForm(map: Map<string, unknown>): SiteSettingsFormInput {
  const social = asSocial(map.get("social_links"));

  return {
    site_name: asString(map.get("site_name"), DEFAULT_SITE_SETTINGS.site_name),
    site_description: asString(
      map.get("site_description"),
      DEFAULT_SITE_SETTINGS.site_description,
    ),
    site_url: asString(
      map.get("site_url"),
      process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_SETTINGS.site_url,
    ),
    default_og_image: asString(
      map.get("default_og_image"),
      DEFAULT_SITE_SETTINGS.default_og_image,
    ),
    ai_disclosure_text: asString(
      map.get("ai_disclosure_text"),
      DEFAULT_SITE_SETTINGS.ai_disclosure_text,
    ),
    social_x: social.x ?? "",
    social_linkedin: social.linkedin ?? "",
    social_rss: social.rss ?? "",
  };
}

function emptyPageData(
  partial?: Partial<AdminSiteSettingsPageData>,
): AdminSiteSettingsPageData {
  return {
    connected: false,
    settingsKnown: false,
    settings: mapToForm(new Map()),
    updatedAt: null,
    ...partial,
  };
}

export async function loadAdminSiteSettingsPage(): Promise<AdminSiteSettingsPageData> {
  if (!hasSupabaseEnv()) {
    return emptyPageData();
  }

  const supabase = await getSafeClient();
  if (!supabase) {
    return emptyPageData();
  }

  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("key, value, updated_at")
      .in("key", [...SITE_SETTINGS_FORM_KEYS]);

    if (error) {
      return emptyPageData({ connected: true, settingsKnown: false });
    }

    const map = new Map<string, unknown>();
    let updatedAt: string | null = null;
    for (const row of data ?? []) {
      map.set(row.key as string, row.value);
      const updated = row.updated_at as string | null;
      if (
        updated &&
        (!updatedAt ||
          new Date(updated).getTime() > new Date(updatedAt).getTime())
      ) {
        updatedAt = updated;
      }
    }

    return {
      connected: true,
      settingsKnown: true,
      settings: mapToForm(map),
      updatedAt,
    };
  } catch {
    return emptyPageData();
  }
}

export async function updateSiteSettings(
  input: SiteSettingsFormInput,
): Promise<ActionResult<{ updatedKeys: string[] }>> {
  try {
    const parsed = siteSettingsFormSchema.safeParse(input);
    if (!parsed.success) {
      return failResult("Form doğrulaması başarısız", zodFieldErrors(parsed.error));
    }

    const { user, supabase } = await requireAdminAction();
    const values = parsed.data;

    const { data: existingRows, error: loadError } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", [...SITE_SETTINGS_FORM_KEYS]);

    if (loadError) {
      logger.error("Ayarlar okunamadı", { reason: loadError.message });
      return failResult("İşlem tamamlanamadı. Lütfen tekrar deneyin.");
    }

    const beforeMap = new Map<string, unknown>();
    for (const row of existingRows ?? []) {
      beforeMap.set(row.key as string, row.value);
    }
    const before = mapToForm(beforeMap);

    const socialLinks = {
      x: values.social_x || undefined,
      linkedin: values.social_linkedin || undefined,
      rss: values.social_rss || undefined,
    };

    const upserts: Array<{ key: string; value: unknown }> = [
      { key: "site_name", value: values.site_name },
      { key: "site_description", value: values.site_description },
      { key: "site_url", value: values.site_url },
      { key: "default_og_image", value: values.default_og_image },
      { key: "ai_disclosure_text", value: values.ai_disclosure_text },
      { key: "social_links", value: socialLinks },
    ];

    const updatedKeys: string[] = [];
    for (const row of upserts) {
      const prev = beforeMap.get(row.key);
      const changed = JSON.stringify(prev) !== JSON.stringify(row.value);
      if (!changed && beforeMap.has(row.key)) continue;

      const { error } = await supabase.from("site_settings").upsert(
        { key: row.key, value: row.value },
        { onConflict: "key" },
      );
      if (error) {
        logger.error("Ayar yazılamadı", {
          key: row.key,
          reason: error.message,
        });
        return failResult("İşlem tamamlanamadı. Lütfen tekrar deneyin.");
      }
      updatedKeys.push(row.key);
    }

    if (updatedKeys.length > 0) {
      await writeAuditLog(supabase, {
        actorId: user.id,
        action: "site_settings.update",
        entityType: "site_settings",
        entityId: null,
        beforeData: before as unknown as Record<string, unknown>,
        afterData: values as unknown as Record<string, unknown>,
      });
    }

    revalidatePath("/admin/settings");
    revalidatePath("/");
    revalidatePath("/kaynaklar");

    return okResult(
      { updatedKeys },
      updatedKeys.length === 0
        ? "Değişiklik yok"
        : "Site ayarları kaydedildi",
    );
  } catch (error) {
    return toActionError(error);
  }
}
