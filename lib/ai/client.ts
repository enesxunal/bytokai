import "server-only";

import { GoogleGenAI } from "@google/genai";
import { getServerEnv } from "@/lib/env";

let client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (client) {
    return client;
  }

  const env = getServerEnv();
  client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  return client;
}

export function getGeminiModel(): string {
  return getServerEnv().GEMINI_MODEL;
}
