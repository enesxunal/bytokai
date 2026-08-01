import "server-only";

import { GoogleGenAI } from "@google/genai";
import { getServerEnv } from "@/lib/env";

/** Sole fallback when process.env.GEMINI_MODEL is missing or blank. */
export const DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite";

let client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (client) {
    return client;
  }

  const env = getServerEnv();
  client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  return client;
}

/**
 * Single source of truth for Gemini model id.
 * Always prefers process.env.GEMINI_MODEL; never uses module env cache.
 */
export function getGeminiModel(): string {
  const fromEnv = process.env.GEMINI_MODEL?.trim();
  const model =
    fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_GEMINI_MODEL;
  console.info("[gemini] model:", model);
  return model;
}
