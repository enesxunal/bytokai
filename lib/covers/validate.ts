/** Client + server için kapak yardımcıları (server-only yok). */

const VIDEO_EXT =
  /\.(mp4|webm|mov|m4v|avi|mkv|m3u8|mpg|mpeg)(?:[?#]|$)/i;
const AUDIO_EXT = /\.(mp3|wav|aac|ogg|flac|m4a)(?:[?#]|$)/i;
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif)(?:[?#]|$)/i;
const NON_IMAGE_EXT = /\.(html?|php|aspx?|jsx?|tsx?|json|xml|pdf|zip)(?:[?#]|$)/i;

/** RSS / kaynak URL'sinin gerçek bir kapak görseli olup olmadığını kontrol eder. */
export function isLikelyCoverImageUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }

  const path = parsed.pathname;
  if (VIDEO_EXT.test(path) || AUDIO_EXT.test(path)) return false;
  if (IMAGE_EXT.test(path)) return true;
  if (NON_IMAGE_EXT.test(path)) return false;

  return true;
}

export function upgradeToHttps(url: string): string {
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol === "http:") {
      parsed.protocol = "https:";
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

export function coverClassForCategory(categorySlug?: string | null): string {
  switch (categorySlug) {
    case "yapay-zeka":
      return "bg-cover-yapay-zeka";
    case "gelistirici":
      return "bg-cover-yazilim";
    case "is-dunyasi":
      return "bg-cover-girisim";
    case "arastirma":
      return "bg-cover-donanim";
    case "yorum":
      return "bg-cover-politika";
    default:
      return "bg-cover-default";
  }
}

export function needsCoverRepair(coverUrl: string | null | undefined): boolean {
  if (!coverUrl?.trim()) return true;
  return !isLikelyCoverImageUrl(coverUrl);
}

export function categoryCoverPalette(categorySlug?: string | null): {
  from: string;
  via: string;
  to: string;
  label: string;
} {
  switch (categorySlug) {
    case "yapay-zeka":
      return { from: "#0b1f4a", via: "#1565ef", to: "#22d3ee", label: "Yapay Zekâ" };
    case "gelistirici":
      return { from: "#07111f", via: "#1e3a8a", to: "#38bdf8", label: "Geliştirici" };
    case "is-dunyasi":
      return { from: "#0c1a2e", via: "#0e7490", to: "#22d3ee", label: "İş Dünyası" };
    case "arastirma":
      return { from: "#0f172a", via: "#0369a1", to: "#67e8f9", label: "Araştırma" };
    case "yorum":
      return { from: "#0b1220", via: "#1d4ed8", to: "#60a5fa", label: "Yorum" };
    default:
      return { from: "#07111f", via: "#1565ef", to: "#22d3ee", label: "BYTOK AI" };
  }
}
