import { z } from "zod";

export const keyFactSchema = z.object({
  claim: z.string().min(1),
  supportedBySource: z.boolean(),
});

export const generatedArticleSchema = z.object({
  title: z.string().min(1).max(200),
  slugSuggestion: z.string().min(1).max(220),
  excerpt: z.string().min(1).max(500),
  contentMarkdown: z.string().min(1),
  categorySlug: z.string().min(1).max(120),
  tags: z.array(z.string().min(1).max(80)).max(12),
  authorPersonaSlug: z.string().min(1).max(120),
  seoTitle: z.string().min(1).max(70),
  seoDescription: z.string().min(1).max(180),
  keyFacts: z.array(keyFactSchema).max(20),
  confidenceScore: z.number().min(0).max(1),
  riskFlags: z.array(z.string().min(1)).max(20),
  suggestedPublishPriority: z.number().int().min(1).max(10),
});

export type GeneratedArticleSchema = z.infer<typeof generatedArticleSchema>;
export type GeneratedArticle = GeneratedArticleSchema;

export const classifyArticleSchema = z.object({
  suitable: z.boolean(),
  reason: z.string().min(1),
  categoryHint: z.string().min(1).max(120),
  technicalDepth: z.number().min(0).max(1),
  businessFocus: z.number().min(0).max(1),
  researchFocus: z.number().min(0).max(1),
  criticalFocus: z.number().min(0).max(1),
});

export type ClassifyArticleSchema = z.infer<typeof classifyArticleSchema>;
export type ClassifyArticleResult = ClassifyArticleSchema;

/** Gemini JSON response schema for article generation. */
export const GENERATED_ARTICLE_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    slugSuggestion: { type: "string" },
    excerpt: { type: "string" },
    contentMarkdown: { type: "string" },
    categorySlug: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    authorPersonaSlug: { type: "string" },
    seoTitle: { type: "string" },
    seoDescription: { type: "string" },
    keyFacts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          claim: { type: "string" },
          supportedBySource: { type: "boolean" },
        },
        required: ["claim", "supportedBySource"],
      },
    },
    confidenceScore: { type: "number" },
    riskFlags: { type: "array", items: { type: "string" } },
    suggestedPublishPriority: { type: "integer" },
  },
  required: [
    "title",
    "slugSuggestion",
    "excerpt",
    "contentMarkdown",
    "categorySlug",
    "tags",
    "authorPersonaSlug",
    "seoTitle",
    "seoDescription",
    "keyFacts",
    "confidenceScore",
    "riskFlags",
    "suggestedPublishPriority",
  ],
} as const;

/** Gemini JSON response schema for classification. */
export const CLASSIFY_ARTICLE_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    suitable: { type: "boolean" },
    reason: { type: "string" },
    categoryHint: { type: "string" },
    technicalDepth: { type: "number" },
    businessFocus: { type: "number" },
    researchFocus: { type: "number" },
    criticalFocus: { type: "number" },
  },
  required: [
    "suitable",
    "reason",
    "categoryHint",
    "technicalDepth",
    "businessFocus",
    "researchFocus",
    "criticalFocus",
  ],
} as const;

export function parseGeneratedArticle(data: unknown): GeneratedArticle {
  return generatedArticleSchema.parse(data);
}

export function safeParseGeneratedArticle(data: unknown) {
  return generatedArticleSchema.safeParse(data);
}
