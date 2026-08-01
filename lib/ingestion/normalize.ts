import { contentHash, hashTitle } from "@/lib/utils/hash";
import { normalizeCanonicalUrl } from "@/lib/utils/url";

/** Intermediate normalized feed record (pre–pipeline mapping). */
export interface NormalizedFeedRecord {
  external_id: string | null;
  title: string;
  url: string;
  canonical_url: string;
  summary: string | null;
  content_text: string | null;
  content_html: string | null;
  image_url: string | null;
  author_name: string | null;
  published_at: string | null;
  language: string | null;
  title_hash: string;
  content_hash: string;
  metadata: Record<string, unknown>;
}

export interface RawSourceItemInput {
  external_id?: string | null;
  title?: string | null;
  url?: string | null;
  link?: string | null;
  summary?: string | null;
  content?: string | null;
  contentSnippet?: string | null;
  content_html?: string | null;
  content_text?: string | null;
  image_url?: string | null;
  enclosure?: { url?: string } | null;
  author?: string | null;
  creator?: string | null;
  pubDate?: string | null;
  isoDate?: string | null;
  published_at?: string | null;
  language?: string | null;
  metadata?: Record<string, unknown>;
}

function cleanText(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length > 0 ? cleaned : null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function resolvePublishedAt(input: RawSourceItemInput): string | null {
  const raw =
    input.published_at ?? input.isoDate ?? input.pubDate ?? null;
  if (!raw) {
    return null;
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

/**
 * Pure normalizer: maps a raw feed/HTML item into a NormalizedFeedRecord.
 * Throws when title or URL is missing/invalid.
 */
export function normalizeSourceItem(
  input: RawSourceItemInput,
): NormalizedFeedRecord {
  const title = cleanText(input.title);
  if (!title) {
    throw new Error("Kaynak öğesinde başlık zorunludur");
  }

  const rawUrl = cleanText(input.url) ?? cleanText(input.link);
  if (!rawUrl) {
    throw new Error("Kaynak öğesinde URL zorunludur");
  }

  const canonical_url = normalizeCanonicalUrl(rawUrl);
  const content_html =
    cleanText(input.content_html) ?? cleanText(input.content);
  const content_text =
    cleanText(input.content_text) ??
    (content_html ? stripHtml(content_html) : null) ??
    cleanText(input.contentSnippet) ??
    cleanText(input.summary);

  const summary =
    cleanText(input.summary) ??
    cleanText(input.contentSnippet) ??
    (content_text ? content_text.slice(0, 280) : null);

  const image_url =
    cleanText(input.image_url) ?? cleanText(input.enclosure?.url ?? null);

  const hashSource = content_text ?? summary ?? title;

  return {
    external_id: cleanText(input.external_id),
    title,
    url: rawUrl,
    canonical_url,
    summary,
    content_text,
    content_html,
    image_url,
    author_name: cleanText(input.author) ?? cleanText(input.creator),
    published_at: resolvePublishedAt(input),
    language: cleanText(input.language),
    title_hash: hashTitle(title),
    content_hash: contentHash(hashSource),
    metadata: input.metadata ?? {},
  };
}
