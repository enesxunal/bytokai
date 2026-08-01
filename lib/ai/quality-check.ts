import type { GeneratedArticle } from "@/lib/ai/schemas";

export interface QualityCheckResult {
  pass: boolean;
  needsReview: boolean;
  reasons: string[];
}

const MIN_CONTENT_CHARS = 400;
const MIN_EXCERPT_CHARS = 40;
const UNSUPPORTED_FACT_RATIO_LIMIT = 0.35;

export function qualityCheck(
  generated: GeneratedArticle,
  minConfidence = 0.62,
): QualityCheckResult {
  const reasons: string[] = [];

  if (!generated.title?.trim()) {
    reasons.push("Başlık eksik");
  }

  if (!generated.excerpt || generated.excerpt.trim().length < MIN_EXCERPT_CHARS) {
    reasons.push("Özet çok kısa");
  }

  if (
    !generated.contentMarkdown ||
    generated.contentMarkdown.trim().length < MIN_CONTENT_CHARS
  ) {
    reasons.push("İçerik uzunluğu yetersiz");
  }

  if (/^#\s/m.test(generated.contentMarkdown)) {
    reasons.push("Markdown gövdede H1 kullanılmış");
  }

  if (!generated.categorySlug?.trim()) {
    reasons.push("Kategori eksik");
  }

  if (!generated.authorPersonaSlug?.trim()) {
    reasons.push("Yazar personası eksik");
  }

  if (!generated.tags?.length) {
    reasons.push("Etiket yok");
  }

  if (
    typeof generated.confidenceScore !== "number" ||
    generated.confidenceScore < minConfidence
  ) {
    reasons.push(
      `Güven skoru eşiğin altında (${generated.confidenceScore} < ${minConfidence})`,
    );
  }

  const highRiskFlags = generated.riskFlags.filter((flag) => {
    const normalized = flag.toLowerCase();
    return (
      normalized.includes("hallucin") ||
      normalized.includes("uydur") ||
      normalized.includes("unsupported") ||
      normalized.includes("paywall") ||
      normalized.includes("insufficient") ||
      normalized.includes("yetersiz") ||
      normalized.includes("defamation") ||
      normalized.includes("iftira")
    );
  });

  if (highRiskFlags.length > 0) {
    reasons.push(`Risk bayrakları: ${highRiskFlags.join(", ")}`);
  }

  if (generated.keyFacts.length > 0) {
    const unsupported = generated.keyFacts.filter((fact) => !fact.supportedBySource);
    const ratio = unsupported.length / generated.keyFacts.length;
    if (ratio > UNSUPPORTED_FACT_RATIO_LIMIT) {
      reasons.push("Kaynak destekli olmayan iddia oranı yüksek");
    }
  } else {
    reasons.push("keyFacts boş");
  }

  const hardFail = reasons.some(
    (reason) =>
      reason.includes("Başlık") ||
      reason.includes("İçerik uzunluğu") ||
      reason.includes("keyFacts") ||
      reason.includes("Risk bayrakları"),
  );

  const confidenceFail = reasons.some((reason) =>
    reason.includes("Güven skoru"),
  );

  if (hardFail) {
    return {
      pass: false,
      needsReview: false,
      reasons,
    };
  }

  if (confidenceFail || reasons.length > 0) {
    return {
      pass: false,
      needsReview: true,
      reasons,
    };
  }

  return {
    pass: true,
    needsReview: false,
    reasons: [],
  };
}
