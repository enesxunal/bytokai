export const FALLBACK_PUBLIC_SITE_URL = "https://www.bytokai.com";

const ALIAS_HOSTS = new Set([
  "bytokai.com",
  "www.bytokai.com",
  "bytok.ai",
  "www.bytok.ai",
]);

/**
 * Public canonical / sitemap / schema URL üretimi.
 * Öncelik: NEXT_PUBLIC_SITE_URL → site_settings.site_url → www.bytokai.com
 * Preview (vercel.app) ve localhost public çıktıya sızmaz.
 */
export function resolvePublicSiteUrl(
  settingsSiteUrl?: string | null,
): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return normalizePublicSiteUrl(fromEnv);
  if (settingsSiteUrl?.trim()) return normalizePublicSiteUrl(settingsSiteUrl);
  return FALLBACK_PUBLIC_SITE_URL;
}

export function normalizePublicSiteUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return FALLBACK_PUBLIC_SITE_URL;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return FALLBACK_PUBLIC_SITE_URL;
    }

    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host.startsWith("127.") ||
      host.endsWith(".vercel.app")
    ) {
      return FALLBACK_PUBLIC_SITE_URL;
    }

    if (ALIAS_HOSTS.has(host)) {
      return FALLBACK_PUBLIC_SITE_URL;
    }

    parsed.protocol = "https:";
    parsed.hash = "";
    parsed.username = "";
    parsed.password = "";
    parsed.search = "";

    let pathname = parsed.pathname.replace(/\/{2,}/g, "/");
    if (pathname.length > 1 && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }
    if (pathname === "/" || pathname === "") {
      return `https://${parsed.hostname.toLowerCase()}`;
    }

    return `https://${parsed.hostname.toLowerCase()}${pathname}`;
  } catch {
    return FALLBACK_PUBLIC_SITE_URL;
  }
}

export function absolutePublicUrl(siteUrl: string, path: string): string {
  const root = normalizePublicSiteUrl(siteUrl).replace(/\/$/, "");
  if (path.startsWith("http://") || path.startsWith("https://")) {
    // External absolute URLs (covers, CDNs) stay intact; only force HTTPS.
    return path.replace(/^http:\/\//i, "https://");
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (normalizedPath === "/") return root;
  return `${root}${normalizedPath}`;
}
