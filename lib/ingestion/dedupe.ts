import { normalizeCanonicalUrl } from "@/lib/utils/url";
import { normalizeTitle } from "@/lib/utils/hash";

const DEFAULT_TITLE_SIMILARITY_THRESHOLD = 0.82;

function tokenize(text: string): Set<string> {
  return new Set(
    normalizeTitle(text)
      .split(" ")
      .map((token) => token.trim())
      .filter((token) => token.length >= 2),
  );
}

/** Jaccard similarity over normalized title tokens (0–1). */
export function titleSimilarity(a: string, b: string): number {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);

  if (tokensA.size === 0 && tokensB.size === 0) {
    return 1;
  }
  if (tokensA.size === 0 || tokensB.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) {
      intersection += 1;
    }
  }

  const union = tokensA.size + tokensB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function isDuplicateByUrl(
  url: string,
  existingUrls: Iterable<string>,
): boolean {
  let canonical: string;
  try {
    canonical = normalizeCanonicalUrl(url);
  } catch {
    return false;
  }

  for (const existing of existingUrls) {
    try {
      if (normalizeCanonicalUrl(existing) === canonical) {
        return true;
      }
    } catch {
      // skip invalid existing urls
    }
  }

  return false;
}

export function isDuplicateByTitle(
  title: string,
  existingTitles: Iterable<string>,
  threshold: number = DEFAULT_TITLE_SIMILARITY_THRESHOLD,
): boolean {
  for (const existing of existingTitles) {
    if (titleSimilarity(title, existing) >= threshold) {
      return true;
    }
  }
  return false;
}

export function findDuplicateTitle(
  title: string,
  existingTitles: Iterable<string>,
  threshold: number = DEFAULT_TITLE_SIMILARITY_THRESHOLD,
): string | null {
  for (const existing of existingTitles) {
    if (titleSimilarity(title, existing) >= threshold) {
      return existing;
    }
  }
  return null;
}
