import "server-only";

import Parser from "rss-parser";
import type { NormalizedSourceItem } from "@/types";
import { normalizeCanonicalUrl } from "@/lib/utils/url";
import { SourceFetchError } from "@/lib/utils/errors";
import {
  DEFAULT_FETCH_TIMEOUT_MS,
  DEFAULT_USER_AGENT,
} from "@/lib/sources/types";

type RssItem = {
  title?: string;
  link?: string;
  guid?: string;
  isoDate?: string;
  pubDate?: string;
  creator?: string;
  contentSnippet?: string;
  content?: string;
  summary?: string;
  categories?: string[];
  enclosure?: { url?: string };
};

const parser = new Parser({
  timeout: DEFAULT_FETCH_TIMEOUT_MS,
  headers: {
    "User-Agent": DEFAULT_USER_AGENT,
    Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
  },
  customFields: {
    item: ["media:content", "media:thumbnail", "dc:creator"],
  },
});

function pickImage(item: RssItem & Record<string, unknown>): string | undefined {
  const enclosure = item.enclosure?.url;
  if (enclosure) return enclosure;

  const mediaContent = item["media:content"] as
    | { $?: { url?: string } }
    | Array<{ $?: { url?: string } }>
    | undefined;
  if (Array.isArray(mediaContent) && mediaContent[0]?.$?.url) {
    return mediaContent[0].$.url;
  }
  if (mediaContent && !Array.isArray(mediaContent) && mediaContent.$?.url) {
    return mediaContent.$.url;
  }

  const mediaThumb = item["media:thumbnail"] as
    | { $?: { url?: string } }
    | undefined;
  if (mediaThumb?.$?.url) {
    return mediaThumb.$.url;
  }

  return undefined;
}

export function mapRssItemToNormalized(
  item: RssItem & Record<string, unknown>,
  sourceId: string,
): NormalizedSourceItem | null {
  const url = item.link?.trim();
  const title = item.title?.trim();
  if (!url || !title) {
    return null;
  }

  let canonicalUrl: string;
  try {
    canonicalUrl = normalizeCanonicalUrl(url);
  } catch {
    return null;
  }

  const author =
    item.creator ||
    (typeof item["dc:creator"] === "string" ? item["dc:creator"] : undefined);

  const excerpt =
    item.contentSnippet?.trim() ||
    item.summary?.trim() ||
    item.content?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() ||
    undefined;

  const limited =
    excerpt && excerpt.length > 1200 ? `${excerpt.slice(0, 1200)}…` : excerpt;

  return {
    sourceId,
    externalId: item.guid?.toString() || canonicalUrl,
    title,
    url,
    canonicalUrl,
    excerpt: limited,
    publishedAt: item.isoDate || (item.pubDate ? new Date(item.pubDate).toISOString() : undefined),
    authorName: author?.toString(),
    imageUrl: pickImage(item),
    rawContent: limited,
    categories: item.categories?.map(String).filter(Boolean),
  };
}

export async function fetchRssNormalizedItems(options: {
  feedUrl: string;
  sourceId: string;
  maxItems?: number;
  signal?: AbortSignal;
}): Promise<NormalizedSourceItem[]> {
  const maxItems = options.maxItems ?? 25;

  try {
    const feed = await parser.parseURL(options.feedUrl);
    const items = (feed.items ?? [])
      .slice(0, maxItems)
      .map((item) =>
        mapRssItemToNormalized(
          item as unknown as RssItem & Record<string, unknown>,
          options.sourceId,
        ),
      )
      .filter((item): item is NormalizedSourceItem => item !== null);

    return items;
  } catch (error) {
    throw new SourceFetchError(
      `RSS feed okunamadı: ${options.feedUrl}`,
      {
        cause: error instanceof Error ? error.message : String(error),
      },
    );
  }
}

export async function fetchWithHtmlFallback(options: {
  feedUrl: string | null;
  listingUrl: string;
  sourceId: string;
  maxItems?: number;
  signal?: AbortSignal;
  linkSelector?: string;
}): Promise<NormalizedSourceItem[]> {
  if (options.feedUrl) {
    try {
      return await fetchRssNormalizedItems({
        feedUrl: options.feedUrl,
        sourceId: options.sourceId,
        maxItems: options.maxItems,
        signal: options.signal,
      });
    } catch {
      // Fall through to HTML listing only when feed fails
    }
  }

  throw new SourceFetchError(
    `RSS feed yok veya okunamadı; HTML listing henüz bağlanmadı: ${options.listingUrl}`,
  );
}
