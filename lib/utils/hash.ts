import { createHash } from "node:crypto";

export function normalizeTitle(title: string): string {
  return title
    .normalize("NFKC")
    .toLocaleLowerCase("tr-TR")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function hashTitle(title: string): string {
  const normalized = normalizeTitle(title);
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

export function contentHash(content: string): string {
  const normalized = content
    .normalize("NFKC")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return createHash("sha256").update(normalized, "utf8").digest("hex");
}
