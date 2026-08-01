const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "utm_name",
  "fbclid",
  "gclid",
  "gbraid",
  "wbraid",
  "mc_cid",
  "mc_eid",
  "igshid",
  "si",
  "ref",
  "ref_src",
  "ncid",
  "cmpid",
  "yclid",
  "msclkid",
  "_ga",
  "_gl",
]);

const ALLOWED_IMAGE_HOSTS = new Set([
  "images.unsplash.com",
  "cdn.bytok.ai",
  "storage.googleapis.com",
  "lh3.googleusercontent.com",
  "i.ytimg.com",
]);

const ALLOWED_IMAGE_PROTOCOLS = new Set(["https:", "http:"]);

function stripWww(hostname: string): string {
  return hostname.replace(/^www\./i, "");
}

export function normalizeCanonicalUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    throw new Error("URL boş olamaz");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`Geçersiz URL: ${url}`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Desteklenmeyen protokol: ${parsed.protocol}`);
  }

  parsed.protocol = "https:";
  parsed.hostname = stripWww(parsed.hostname).toLowerCase();
  parsed.hash = "";
  parsed.username = "";
  parsed.password = "";

  const keys = [...parsed.searchParams.keys()];
  for (const key of keys) {
    if (TRACKING_PARAMS.has(key.toLowerCase())) {
      parsed.searchParams.delete(key);
    }
  }

  const sorted = [...parsed.searchParams.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  );
  parsed.search = "";
  for (const [key, value] of sorted) {
    parsed.searchParams.append(key, value);
  }

  let pathname = parsed.pathname.replace(/\/{2,}/g, "/");
  if (pathname.length > 1 && pathname.endsWith("/")) {
    pathname = pathname.slice(0, -1);
  }
  if (pathname === "") {
    pathname = "/";
  }
  parsed.pathname = pathname;

  if (parsed.pathname === "/" && parsed.search === "") {
    return `${parsed.protocol}//${parsed.host}/`;
  }

  return parsed.toString();
}

export function isAllowedImageUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (!ALLOWED_IMAGE_PROTOCOLS.has(parsed.protocol)) {
    return false;
  }

  const host = stripWww(parsed.hostname).toLowerCase();
  if (ALLOWED_IMAGE_HOSTS.has(host)) {
    return true;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    try {
      const siteHost = stripWww(new URL(siteUrl).hostname).toLowerCase();
      if (host === siteHost) {
        return true;
      }
    } catch {
      // ignore invalid site url
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    try {
      const supabaseHost = stripWww(new URL(supabaseUrl).hostname).toLowerCase();
      if (host === supabaseHost || host.endsWith(".supabase.co")) {
        return true;
      }
    } catch {
      // ignore invalid supabase url
    }
  }

  return /\.(jpe?g|png|gif|webp|avif|svg)$/i.test(parsed.pathname);
}

export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return stripWww(parsed.hostname).toLowerCase();
  } catch {
    throw new Error(`Geçersiz URL: ${url}`);
  }
}
