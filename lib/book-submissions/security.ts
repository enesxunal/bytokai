import { createHash, randomUUID } from "node:crypto";

const WINDOW_MS = 60 * 60 * 1000;

const memoryHits = new Map<string, number[]>();

function prune(timestamps: number[], windowMs: number, now: number): number[] {
  return timestamps.filter((t) => now - t < windowMs);
}

export function hashIp(ip: string): string {
  return createHash("sha256").update(`bytok-book:${ip}`, "utf8").digest("hex");
}

export function checkMemoryRateLimit(
  key: string,
  max: number,
  windowMs = WINDOW_MS,
): boolean {
  const now = Date.now();
  const next = prune(memoryHits.get(key) ?? [], windowMs, now);
  if (next.length >= max) {
    memoryHits.set(key, next);
    return false;
  }
  next.push(now);
  memoryHits.set(key, next);
  return true;
}

/** Test helper */
export function resetMemoryRateLimit(): void {
  memoryHits.clear();
}

export function buildStoragePath(originalFilename: string): string {
  const ext = originalFilename.includes(".")
    ? originalFilename.slice(originalFilename.lastIndexOf(".")).toLowerCase()
    : "";
  const safeExt = [".pdf", ".doc", ".docx"].includes(ext) ? ext : ".bin";
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `${stamp}/${randomUUID()}${safeExt}`;
}

export { WINDOW_MS };
