export interface AuthorScoreDimensions {
  technicalDepth: number;
  businessFocus: number;
  researchFocus: number;
  criticalFocus: number;
}

export interface AuthorPersonaCandidate {
  id: string;
  slug: string;
  name?: string;
  active?: boolean;
  /** Optional per-author affinity weights (0–1). Defaults derived from expertise. */
  weights?: Partial<AuthorScoreDimensions>;
  expertise?: string[];
}

const EXPERTISE_WEIGHT_HINTS: Record<string, Partial<AuthorScoreDimensions>> = {
  technical: { technicalDepth: 1, researchFocus: 0.4 },
  teknik: { technicalDepth: 1, researchFocus: 0.4 },
  engineering: { technicalDepth: 1 },
  ai: { technicalDepth: 0.8, researchFocus: 0.7 },
  research: { researchFocus: 1, technicalDepth: 0.5 },
  arastirma: { researchFocus: 1, technicalDepth: 0.5 },
  araştırma: { researchFocus: 1, technicalDepth: 0.5 },
  business: { businessFocus: 1 },
  is: { businessFocus: 1 },
  startup: { businessFocus: 0.9 },
  critique: { criticalFocus: 1 },
  kritik: { criticalFocus: 1 },
  opinion: { criticalFocus: 0.8, businessFocus: 0.3 },
  // Profile expertise tags (Turkish)
  api: { technicalDepth: 1, researchFocus: 0.35 },
  "büyük dil": { technicalDepth: 1, researchFocus: 0.5 },
  "açık kaynak": { technicalDepth: 0.9, researchFocus: 0.4 },
  geliştirici: { technicalDepth: 1 },
  mimari: { technicalDepth: 1, researchFocus: 0.4 },
  entegrasyon: { technicalDepth: 0.9 },
  bulut: { technicalDepth: 0.8, businessFocus: 0.4 },
  benchmark: { researchFocus: 0.9, technicalDepth: 0.7 },
  performans: { technicalDepth: 0.8, researchFocus: 0.5 },
  "model değerlendirme": { researchFocus: 1, technicalDepth: 0.6 },
  "veri set": { researchFocus: 1 },
  metodoloji: { researchFocus: 1 },
  güvenilirlik: { researchFocus: 0.9, criticalFocus: 0.4 },
  bilimsel: { researchFocus: 1 },
  yatırım: { businessFocus: 1 },
  şirket: { businessFocus: 1 },
  "satın alma": { businessFocus: 1 },
  girişim: { businessFocus: 0.95 },
  pazar: { businessFocus: 1 },
  ekonomi: { businessFocus: 1 },
  kurumsal: { businessFocus: 0.9 },
  finansal: { businessFocus: 1 },
  regülasyon: { criticalFocus: 1, businessFocus: 0.4 },
  "dijital hak": { criticalFocus: 1 },
  gizlilik: { criticalFocus: 0.95 },
  etik: { criticalFocus: 1 },
  "iş gücü": { criticalFocus: 0.9, businessFocus: 0.4 },
  telif: { criticalFocus: 0.9 },
  platform: { criticalFocus: 0.7, businessFocus: 0.6 },
  güvenlik: { criticalFocus: 0.7, researchFocus: 0.6 },
  trend: { businessFocus: 0.5, criticalFocus: 0.3 },
  tüketici: { businessFocus: 0.5 },
  "dijital yaşam": { businessFocus: 0.4 },
  gelecek: { businessFocus: 0.45 },
  "yaratıcı araç": { technicalDepth: 0.5, businessFocus: 0.4 },
  asistan: { technicalDepth: 0.5, businessFocus: 0.4 },
  kültür: { criticalFocus: 0.4, businessFocus: 0.4 },
};

function clamp01(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

function matchExpertiseHint(
  tag: string,
): Partial<AuthorScoreDimensions> | undefined {
  const lower = tag.toLowerCase().trim();
  const exact = EXPERTISE_WEIGHT_HINTS[lower];
  if (exact) return exact;

  for (const [key, hint] of Object.entries(EXPERTISE_WEIGHT_HINTS)) {
    if (key.length < 3) continue;
    if (lower.includes(key) || key.includes(lower)) {
      return hint;
    }
  }
  return undefined;
}

function deriveWeights(
  author: AuthorPersonaCandidate,
): AuthorScoreDimensions {
  const base: AuthorScoreDimensions = {
    technicalDepth: 0.35,
    businessFocus: 0.35,
    researchFocus: 0.35,
    criticalFocus: 0.35,
  };

  for (const tag of author.expertise ?? []) {
    const hint = matchExpertiseHint(tag);
    if (!hint) {
      continue;
    }
    for (const key of Object.keys(hint) as (keyof AuthorScoreDimensions)[]) {
      const value = hint[key];
      if (typeof value === "number") {
        base[key] = Math.max(base[key], value);
      }
    }
  }

  return {
    technicalDepth: clamp01(author.weights?.technicalDepth ?? base.technicalDepth),
    businessFocus: clamp01(author.weights?.businessFocus ?? base.businessFocus),
    researchFocus: clamp01(author.weights?.researchFocus ?? base.researchFocus),
    criticalFocus: clamp01(author.weights?.criticalFocus ?? base.criticalFocus),
  };
}

export function scoreAuthorFit(
  scores: AuthorScoreDimensions,
  author: AuthorPersonaCandidate,
): number {
  const weights = deriveWeights(author);
  const dims: (keyof AuthorScoreDimensions)[] = [
    "technicalDepth",
    "businessFocus",
    "researchFocus",
    "criticalFocus",
  ];

  let total = 0;
  let weightSum = 0;
  for (const dim of dims) {
    const w = weights[dim];
    total += clamp01(scores[dim]) * w;
    weightSum += w;
  }

  return weightSum === 0 ? 0 : total / weightSum;
}

/**
 * Pure author persona selection.
 * Prefers best score fit and avoids the most recent author when alternatives exist.
 */
export function selectAuthorPersona(
  scores: AuthorScoreDimensions,
  authors: readonly AuthorPersonaCandidate[],
  recentAuthorIds: readonly string[] = [],
): AuthorPersonaCandidate | null {
  const active = authors.filter((author) => author.active !== false);
  if (active.length === 0) {
    return null;
  }

  const lastRecent = recentAuthorIds[recentAuthorIds.length - 1] ?? null;

  const ranked = [...active]
    .map((author) => ({
      author,
      score: scoreAuthorFit(scores, author),
      recentPenalty:
        lastRecent && author.id === lastRecent
          ? 0.15
          : recentAuthorIds.includes(author.id)
            ? 0.05
            : 0,
    }))
    .map((row) => ({
      ...row,
      final: row.score - row.recentPenalty,
    }))
    .sort((a, b) => b.final - a.final || a.author.slug.localeCompare(b.author.slug));

  // If the top pick is the consecutive same author and there is another option, pick next.
  const top = ranked[0];
  if (!top) {
    return null;
  }

  if (
    lastRecent &&
    top.author.id === lastRecent &&
    ranked.length > 1 &&
    ranked[1]!.final >= top.final - 0.08
  ) {
    return ranked[1]!.author;
  }

  return top.author;
}
