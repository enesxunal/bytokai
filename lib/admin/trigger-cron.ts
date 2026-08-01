import "server-only";

import { getClientEnvSoft, getServerEnv } from "@/lib/env";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("admin.trigger-cron");

export type CronJobName = "ingest" | "process" | "publish" | "maintenance";

export type CronTriggerResult = {
  job: CronJobName;
  status: number;
  body: unknown;
};

/**
 * Manuel cron tetikleme — CRON_SECRET yalnızca sunucuda kullanılır, client'a gitmez.
 */
export async function triggerCronJob(
  job: CronJobName,
): Promise<CronTriggerResult> {
  const serverEnv = getServerEnv();
  const siteUrl = getClientEnvSoft().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const url = `${siteUrl}/api/cron/${job}`;

  logger.info("Manuel cron tetikleniyor", { job });

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${serverEnv.CRON_SECRET}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  let body: unknown = null;
  const text = await response.text();
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text.slice(0, 500) };
  }

  if (!response.ok) {
    logger.warn("Manuel cron başarısız", {
      job,
      status: response.status,
    });
    throw new Error(
      typeof body === "object" &&
        body !== null &&
        "error" in body &&
        typeof (body as { error: unknown }).error === "string"
        ? (body as { error: string }).error
        : `${job} görevi tetiklenemedi (HTTP ${response.status})`,
    );
  }

  return { job, status: response.status, body };
}
