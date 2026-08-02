import "server-only";

import * as cheerio from "cheerio";

import { isLikelyCoverImageUrl, upgradeToHttps } from "@/lib/covers/validate";
import { DEFAULT_USER_AGENT } from "@/lib/sources/types";

function absolutize(baseUrl: string, candidate: string): string | null {
  try {
    return new URL(candidate, baseUrl).toString();
  } catch {
    return null;
  }
}

function pickMeta(
  $: cheerio.CheerioAPI,
  selectors: string[],
): string | null {
  for (const selector of selectors) {
    const value = $(selector).attr("content")?.trim();
    if (value) return value;
  }
  return null;
}

/** Kaynak sayfadan og:image / twitter:image çıkarır. */
export async function scrapeOgImageUrl(
  pageUrl: string,
  signal?: AbortSignal,
): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    if (signal) {
      if (signal.aborted) controller.abort();
      else signal.addEventListener("abort", () => controller.abort(), { once: true });
    }

    const response = await fetch(pageUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("xml")) {
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const raw =
      pickMeta($, [
        'meta[property="og:image:secure_url"]',
        'meta[property="og:image:url"]',
        'meta[property="og:image"]',
        'meta[name="twitter:image"]',
        'meta[name="twitter:image:src"]',
      ]) ??
      $("link[rel='image_src']").attr("href")?.trim() ??
      null;

    if (!raw) return null;

    const absolute = absolutize(pageUrl, raw);
    if (!absolute || !isLikelyCoverImageUrl(absolute)) return null;

    return upgradeToHttps(absolute);
  } catch {
    return null;
  }
}

/** Uzak görselin gerçekten image/* olduğunu HEAD/GET ile doğrular. */
export async function probeImageUrl(
  url: string,
  signal?: AbortSignal,
): Promise<boolean> {
  if (!isLikelyCoverImageUrl(url)) return false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6_000);
    if (signal) {
      if (signal.aborted) controller.abort();
      else signal.addEventListener("abort", () => controller.abort(), { once: true });
    }

    let response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": DEFAULT_USER_AGENT },
    }).finally(() => clearTimeout(timeout));

    // Bazı CDN'ler HEAD'i reddeder.
    if (response.status === 405 || response.status === 403 || response.status === 501) {
      const getController = new AbortController();
      const getTimeout = setTimeout(() => getController.abort(), 6_000);
      response = await fetch(url, {
        method: "GET",
        signal: getController.signal,
        redirect: "follow",
        headers: {
          "User-Agent": DEFAULT_USER_AGENT,
          Range: "bytes=0-1023",
        },
      }).finally(() => clearTimeout(getTimeout));
    }

    if (!response.ok && response.status !== 206) return false;

    const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
    if (contentType.startsWith("image/")) return true;
    if (contentType.startsWith("video/") || contentType.startsWith("audio/")) {
      return false;
    }

    // Content-Type belirsiz ama uzantı görselse kabul et.
    return /\.(jpe?g|png|gif|webp|avif)(?:[?#]|$)/i.test(new URL(url).pathname);
  } catch {
    return false;
  }
}
