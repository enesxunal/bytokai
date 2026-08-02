import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { uploadCoverBytes } from "@/lib/admin/cover-image";
import { generateCoverPng } from "@/lib/covers/generate";
import { probeImageUrl, scrapeOgImageUrl } from "@/lib/covers/scrape";
import {
  isLikelyCoverImageUrl,
  needsCoverRepair,
  upgradeToHttps,
} from "@/lib/covers/validate";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("covers.ensure");

export type EnsureCoverInput = {
  title: string;
  sourceUrl?: string | null;
  originalImageUrl?: string | null;
  categorySlug?: string | null;
  categoryName?: string | null;
};

export type EnsureCoverResult = {
  url: string | null;
  source: "original" | "og" | "generated" | "none";
};

async function acceptRemoteImage(url: string): Promise<string | null> {
  if (!isLikelyCoverImageUrl(url)) return null;
  const httpsUrl = upgradeToHttps(url);
  const ok = await probeImageUrl(httpsUrl);
  if (ok) return httpsUrl;

  // HTTPS başarısızsa orijinal http adayını da dene (bazı CDN'ler).
  if (httpsUrl !== url) {
    const httpOk = await probeImageUrl(url);
    if (httpOk) return url;
  }

  return null;
}

/**
 * Geçerli bir kapak URL'si bulur; yoksa markalı görsel üretip storage'a yükler.
 */
export async function ensureArticleCover(
  supabase: SupabaseClient,
  input: EnsureCoverInput,
): Promise<EnsureCoverResult> {
  const original = input.originalImageUrl?.trim() || null;
  if (original) {
    const accepted = await acceptRemoteImage(original);
    if (accepted) {
      return { url: accepted, source: "original" };
    }
    logger.info("Orijinal kapak geçersiz, alternatif aranıyor", {
      url: original.slice(0, 180),
    });
  }

  if (input.sourceUrl?.trim()) {
    const og = await scrapeOgImageUrl(input.sourceUrl.trim());
    if (og) {
      const accepted = await acceptRemoteImage(og);
      if (accepted) {
        return { url: accepted, source: "og" };
      }
    }
  }

  try {
    const png = await generateCoverPng({
      title: input.title,
      categorySlug: input.categorySlug,
      categoryName: input.categoryName,
    });
    const uploaded = await uploadCoverBytes(supabase, png, "image/png");
    if (uploaded) {
      return { url: uploaded, source: "generated" };
    }
  } catch (error) {
    logger.warn("Kapak üretimi başarısız", {
      reason: error instanceof Error ? error.message : String(error),
    });
  }

  return { url: null, source: "none" };
}

export { needsCoverRepair };
