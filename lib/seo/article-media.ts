import { isLikelyCoverImageUrl } from "@/lib/covers/validate";
import { absolutePublicUrl } from "@/lib/seo/site-url";

const WEAK_IMAGE_RE =
  /(^|\/)(favicon|apple-icon|apple-touch-icon|icon)\.(ico|png)(\?|$)/i;

function isWeakShareImage(url: string): boolean {
  return WEAK_IMAGE_RE.test(url);
}

/**
 * Haber paylaşım / schema görseli: kapak → default OG → marka görseli.
 * Favicon / küçük ikon kullanılmaz.
 */
export function resolveArticleShareImage(
  siteUrl: string,
  coverImageUrl?: string | null,
  defaultOgImage?: string | null,
): string {
  const candidates = [
    coverImageUrl?.trim() || null,
    defaultOgImage?.trim() || null,
    "/bytok-ai.png",
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (isWeakShareImage(candidate)) continue;

    if (candidate.startsWith("http://") || candidate.startsWith("https://")) {
      if (
        !isLikelyCoverImageUrl(candidate) &&
        !/bytok-ai(?:-on-(?:light|dark)|-mark)?\.png/i.test(candidate)
      ) {
        continue;
      }
      return candidate.replace(/^http:\/\//i, "https://");
    }

    const path = candidate.startsWith("/") ? candidate : `/${candidate}`;
    if (isWeakShareImage(path)) continue;
    return absolutePublicUrl(siteUrl, path);
  }

  return absolutePublicUrl(siteUrl, "/bytok-ai.png");
}
