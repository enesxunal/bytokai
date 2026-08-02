import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { DEFAULT_USER_AGENT } from "@/lib/sources/types";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("covers.brand");

const TARGET_WIDTH = 1600;
const TARGET_HEIGHT = 900;
const MARK_WIDTH = 280;
const MARK_PAD = 36;

let markBufferPromise: Promise<Buffer> | null = null;

async function loadLogoMark(): Promise<Buffer> {
  if (!markBufferPromise) {
    markBufferPromise = readFile(
      path.join(process.cwd(), "public", "bytok-ai-mark.png"),
    ).catch(async () =>
      // Fallback to full dark wordmark if mark missing.
      readFile(path.join(process.cwd(), "public", "bytok-ai-on-dark.png")),
    );
  }
  return markBufferPromise;
}

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
 * Uzak kapak görselini 16:9'a getirir ve sağ alta BYTOK AI logosunu damgalar.
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
    logger.warn("Kapak damgalama başarısız", {
      reason: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/** Hazır PNG buffer'a logo damgası ekler. */
export async function brandCoverBuffer(coverPng: Buffer): Promise<Buffer> {
  const markSource = await loadLogoMark();
  const mark = await sharp(markSource)
    .resize({ width: MARK_WIDTH, height: 80, fit: "inside" })
    .ensureAlpha()
    .png()
    .toBuffer();

  const markMeta = await sharp(mark).metadata();
  const markW = markMeta.width ?? MARK_WIDTH;
  const markH = markMeta.height ?? 72;

  // Soft dark plate behind logo for contrast on any photo.
  const platePadX = 18;
  const platePadY = 12;
  const plateW = markW + platePadX * 2;
  const plateH = markH + platePadY * 2;
  const plate = await sharp({
    create: {
      width: plateW,
      height: plateH,
      channels: 4,
      background: { r: 7, g: 17, b: 31, alpha: 0.55 },
    },
  })
    .png()
    .toBuffer();

  const left = TARGET_WIDTH - MARK_PAD - plateW;
  const top = TARGET_HEIGHT - MARK_PAD - plateH;

  return sharp(coverPng)
    .composite([
      { input: plate, left, top },
      {
        input: mark,
        left: left + platePadX,
        top: top + platePadY,
      },
    ])
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
}
