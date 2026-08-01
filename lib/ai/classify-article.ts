import "server-only";

import { AIError } from "@/lib/utils/errors";
import { createLogger } from "@/lib/utils/logger";
import { getGeminiClient, getGeminiModel } from "@/lib/ai/client";
import { buildClassifyPrompt, EDITORIAL_RULES } from "@/lib/ai/prompts";
import { withRetry } from "@/lib/ai/retry";
import {
  CLASSIFY_ARTICLE_RESPONSE_SCHEMA,
  classifyArticleSchema,
  type ClassifyArticleResult,
} from "@/lib/ai/schemas";

const log = createLogger("ai:classify");

export interface ClassifyArticleInput {
  title: string;
  excerpt: string | null;
  limitedContent: string | null;
  sourceName: string;
  url: string;
  categorySlugs: string[];
  timeoutMs?: number;
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

  throw new AIError("Sınıflandırma JSON çıktısı bulunamadı");
}

export async function classifyArticle(
  input: ClassifyArticleInput,
): Promise<ClassifyArticleResult> {
  const model = getGeminiModel();
  const timeoutMs = input.timeoutMs ?? 30_000;
  const prompt = buildClassifyPrompt(input);

  try {
    return await withRetry({
      maxAttempts: 3,
      baseDelayMs: 500,
      fn: async () => {
        const client = getGeminiClient();

        let timer: ReturnType<typeof setTimeout> | undefined;
        const response = await Promise.race([
          client.models.generateContent({
            model,
            contents: prompt,
            config: {
              systemInstruction: [
                "Sen BYTOK AI içerik uygunluk sınıflandırıcısısın.",
                EDITORIAL_RULES,
                "Yalnızca JSON döndür.",
              ].join("\n"),
              temperature: 0.2,
              responseMimeType: "application/json",
              responseSchema: CLASSIFY_ARTICLE_RESPONSE_SCHEMA,
            },
          }),
          new Promise<never>((_, reject) => {
            timer = setTimeout(
              () => reject(new AIError(`Gemini classify zaman aşımı (${timeoutMs}ms)`)),
              timeoutMs,
            );
          }),
        ]).finally(() => {
          if (timer) clearTimeout(timer);
        });

        const text = response.text;
        if (!text) {
          throw new AIError("Sınıflandırma yanıtı boş");
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(extractJsonText(text));
        } catch (error) {
          throw new AIError("Sınıflandırma JSON parse hatası", {
            cause: error instanceof Error ? error.message : String(error),
          });
        }

        const validated = classifyArticleSchema.safeParse(parsed);
        if (!validated.success) {
          throw new AIError("Sınıflandırma şema doğrulaması başarısız", {
            issues: validated.error.issues,
          });
        }

        return validated.data;
      },
    });
  } catch (error) {
    log.error("Classification failed", {
      title: input.title,
      url: input.url,
      message: error instanceof Error ? error.message : "unknown",
    });

    if (error instanceof AIError) {
      throw error;
    }

    throw new AIError(
      error instanceof Error ? error.message : "Sınıflandırma hatası",
      { cause: error },
    );
  }
}
