import "server-only";

import sharp from "sharp";

import { DEFAULT_USER_AGENT } from "@/lib/sources/types";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("covers.brand");

const TARGET_WIDTH = 1600;
const TARGET_HEIGHT = 900;

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": DEFAULT_USER_AGENT, Accept: "image/*" },
      signal: AbortSignal.timeout(12_000),
      redirect: "follow",
    });
    if (!response.ok) return null;
    const type = (response.headers.get("content-type") ?? "").toLowerCase();
    if (type.startsWith("video/") || type.startsWith("audio/")) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength < 100 || bytes.byteLength > 8 * 1024 * 1024) {
      return null;
    }
    return bytes;
  } catch (error) {
    logger.warn("Kapak indirme başarısız", {
      reason: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Uzak kapak görselini 16:9'a getirir.
 * Logo damgası sitede CSS ile alt ortaya konur — buraya basılmaz (çift logo olmasın).
 */
export async function brandCoverImageFromUrl(url: string): Promise<Buffer | null> {
  const source = await fetchImageBuffer(url);
  if (!source) return null;

  try {
    const base = await sharp(source)
      .rotate()
      .resize(TARGET_WIDTH, TARGET_HEIGHT, {
        fit: "cover",
        position: "attention",
      })
      .ensureAlpha()
      .png()
      .toBuffer();

    return brandCoverBuffer(base);
  } catch (error) {
    logger.warn("Kapak işleme başarısız", {
      reason: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/** Kapak buffer'ı 16:9 JPEG'e çevirir (logo damgası yok). */
export async function brandCoverBuffer(coverPng: Buffer): Promise<Buffer> {
  return sharp(coverPng)
    .resize(TARGET_WIDTH, TARGET_HEIGHT, {
      fit: "cover",
      position: "centre",
    })
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
}
