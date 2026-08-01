import type { NormalizedSourceItem } from "@/types";

export type { NormalizedSourceItem };

export interface SourceAdapter {
  readonly slug: string;
  readonly name: string;
  readonly homepageUrl: string;
  readonly sectionUrl: string;
  readonly feedUrl: string | null;
  readonly ingestionType: "rss" | "html" | "manual";
  fetchItems(options?: {
    sourceId?: string;
    maxItems?: number;
    signal?: AbortSignal;
  }): Promise<NormalizedSourceItem[]>;
}

export const DEFAULT_FETCH_TIMEOUT_MS = 20_000;
export const DEFAULT_USER_AGENT =
  "BYTOK-AI-Bot/1.0 (+https://bytok.ai/kaynaklar; editorial ingestion; respects robots)";
