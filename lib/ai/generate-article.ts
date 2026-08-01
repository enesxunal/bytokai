import "server-only";

import type { Author } from "@/types";
import { AIError } from "@/lib/utils/errors";
import { createLogger } from "@/lib/utils/logger";
import { getGeminiClient, getGeminiModel } from "@/lib/ai/client";
import {
  buildGenerationPrompt,
  buildSystemPrompt,
  PROMPT_VERSION,
  type SourcePackage,
} from "@/lib/ai/prompts";
import { withRetry } from "@/lib/ai/retry";
import {
  GENERATED_ARTICLE_RESPONSE_SCHEMA,
  generatedArticleSchema,
  type GeneratedArticle,
} from "@/lib/ai/schemas";

const log = createLogger("ai:generate");

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_ATTEMPTS = 3;

export interface GenerateArticleInput {
  author: Author;
  sourcePackage: SourcePackage;
  timeoutMs?: number;
  maxAttempts?: number;
}

export interface GenerateArticleResult {
  article: GeneratedArticle;
  model: string;
  promptVersion: string;
  latencyMs: number;
  rawText: string;
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new AIError(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

function extractJsonText(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) {
    return trimmed.slice(first, last + 1);
  }

  throw new AIError("Gemini JSON çıktısı bulunamadı");
}

export async function generateArticle(
  input: GenerateArticleInput,
): Promise<GenerateArticleResult> {
  const model = getGeminiModel();
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxAttempts = input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const started = Date.now();

  const systemPrompt = buildSystemPrompt(input.author);
  const userPrompt = buildGenerationPrompt({
    ...input.sourcePackage,
    selectedAuthorSlug: input.author.slug,
  });

  try {
    const article = await withRetry({
      maxAttempts,
      baseDelayMs: 800,
      onRetry: (error, attempt, delayMs) => {
        log.warn("Gemini generate retry", {
          attempt,
          delayMs,
          message: error instanceof Error ? error.message : "unknown",
        });
      },
      fn: async () => {
        const client = getGeminiClient();
        const response = await withTimeout(
          client.models.generateContent({
            model,
            contents: userPrompt,
            config: {
              systemInstruction: systemPrompt,
              temperature: 0.55,
              responseMimeType: "application/json",
              responseSchema: GENERATED_ARTICLE_RESPONSE_SCHEMA,
            },
          }),
          timeoutMs,
          `Gemini generate zaman aşımı (${timeoutMs}ms)`,
        );

        const text = response.text;
        if (!text) {
          throw new AIError("Gemini boş yanıt döndürdü");
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(extractJsonText(text));
        } catch (error) {
          throw new AIError("Gemini JSON parse hatası", {
            cause: error instanceof Error ? error.message : String(error),
          });
        }

        const validated = generatedArticleSchema.safeParse(parsed);
        if (!validated.success) {
          throw new AIError("Gemini çıktısı şema doğrulamasından geçmedi", {
            issues: validated.error.issues,
          });
        }

        return {
          article: validated.data,
          rawText: text,
        };
      },
    });

    return {
      article: article.article,
      model,
      promptVersion: PROMPT_VERSION,
      latencyMs: Date.now() - started,
      rawText: article.rawText,
    };
  } catch (error) {
    log.error("Article generation failed", {
      authorSlug: input.author.slug,
      sourceUrl: input.sourcePackage.originalUrl,
      message: error instanceof Error ? error.message : "unknown",
    });

    if (error instanceof AIError) {
      throw error;
    }

    throw new AIError(
      error instanceof Error ? error.message : "AI üretim hatası",
      { cause: error },
    );
  }
}
