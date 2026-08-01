import "server-only";

import { createServiceClient } from "@/lib/supabase/server";
import {
  checkMemoryRateLimit,
  WINDOW_MS,
} from "@/lib/book-submissions/security";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("book-submissions.rate-limit");

const MAX_PER_IP_HOUR = 3;
const MAX_PER_EMAIL_DAY = 2;

export async function assertSubmissionAllowed(input: {
  email: string;
  ipHash: string | null;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const memKey = input.ipHash ? `ip:${input.ipHash}` : `email:${input.email}`;
  if (!checkMemoryRateLimit(memKey, MAX_PER_IP_HOUR)) {
    return {
      ok: false,
      message: "Çok fazla başvuru gönderildi. Lütfen daha sonra tekrar deneyin.",
    };
  }

  try {
    const supabase = createServiceClient();
    const hourAgo = new Date(Date.now() - WINDOW_MS).toISOString();
    const dayAgo = new Date(Date.now() - 24 * WINDOW_MS).toISOString();

    if (input.ipHash) {
      const { count, error } = await supabase
        .from("book_submissions")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", input.ipHash)
        .gte("created_at", hourAgo);

      if (!error && (count ?? 0) >= MAX_PER_IP_HOUR) {
        return {
          ok: false,
          message:
            "Çok fazla başvuru gönderildi. Lütfen daha sonra tekrar deneyin.",
        };
      }
    }

    const { count: emailCount, error: emailError } = await supabase
      .from("book_submissions")
      .select("id", { count: "exact", head: true })
      .eq("email", input.email)
      .gte("created_at", dayAgo);

    if (!emailError && (emailCount ?? 0) >= MAX_PER_EMAIL_DAY) {
      return {
        ok: false,
        message:
          "Bu e-posta ile kısa süre içinde birden fazla başvuru yapılamaz.",
      };
    }
  } catch (err) {
    logger.warn("Rate limit DB kontrolü atlandı", {
      reason: err instanceof Error ? err.message : "unknown",
    });
  }

  return { ok: true };
}

export { buildStoragePath, hashIp } from "@/lib/book-submissions/security";
