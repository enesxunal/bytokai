import "server-only";

export const LISTING_PAGE_SIZE = 12;
export const MAX_SEARCH_QUERY_LENGTH = 100;

export function parsePageParam(
  value: string | string[] | undefined,
): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? "1", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(parsed, 10_000);
}

export function sanitizeSearchQuery(
  value: string | string[] | undefined,
): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string") return "";

  return raw
    .normalize("NFC")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, MAX_SEARCH_QUERY_LENGTH);
}

export function absoluteUrl(base: string, path: string): string {
  const root = base.replace(/\/$/, "");
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${root}${path.startsWith("/") ? path : `/${path}`}`;
}

export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function breadcrumbJsonLd(
  siteUrl: string,
  items: Array<{ name: string; path: string }>,
) {
  const root = siteUrl.replace(/\/$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Ana sayfa",
        item: root,
      },
      ...items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 2,
        name: item.name,
        item: absoluteUrl(root, item.path),
      })),
    ],
  };
}

export function listingCanonical(
  siteUrl: string,
  path: string,
  page: number,
  query?: Record<string, string>,
): string {
  const url = new URL(absoluteUrl(siteUrl, path));
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value) url.searchParams.set(key, value);
    }
  }
  if (page > 1) url.searchParams.set("sayfa", String(page));
  return url.toString();
}
