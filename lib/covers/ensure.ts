import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { uploadCoverBytes } from "@/lib/admin/cover-image";
import { brandCoverImageFromUrl } from "@/lib/covers/brand";
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

  if (httpsUrl !== url) {
    const httpOk = await probeImageUrl(url);
    if (httpOk) return url;
  }

  return null;
}

async function brandAndUpload(
  supabase: SupabaseClient,
  remoteUrl: string,
): Promise<string | null> {
  const branded = await brandCoverImageFromUrl(remoteUrl);
  if (!branded) return null;
  return uploadCoverBytes(supabase, branded, "image/jpeg");
}

/**
 * Geçerli bir kapak URL'si bulur; logo damgalayıp storage'a yükler.
 * Görsel yoksa markalı kapak üretir.
 */
export async function ensureArticleCover(
  supabase: SupabaseClient,
  input: EnsureCoverInput,
): Promise<EnsureCoverResult> {
  const candidates: Array<{ url: string; source: "original" | "og" }> = [];

  const original = input.originalImageUrl?.trim() || null;
  if (original) {
    const accepted = await acceptRemoteImage(original);
    if (accepted) {
      candidates.push({ url: accepted, source: "original" });
    } else {
      logger.info("Orijinal kapak geçersiz, alternatif aranıyor", {
        url: original.slice(0, 180),
      });
    }
  }

  if (input.sourceUrl?.trim()) {
    const og = await scrapeOgImageUrl(input.sourceUrl.trim());
    if (og) {
      const accepted = await acceptRemoteImage(og);
      if (accepted) {
        candidates.push({ url: accepted, source: "og" });
      }
    }
  }

  for (const candidate of candidates) {
    const uploaded = await brandAndUpload(supabase, candidate.url);
    if (uploaded) {
      return { url: uploaded, source: candidate.source };
    }
    logger.warn("Kapak damgalanamadı, sonraki adaya geçiliyor", {
      source: candidate.source,
    });
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
