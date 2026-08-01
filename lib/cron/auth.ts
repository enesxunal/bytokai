import { NextResponse } from "next/server";

export type CronJobType = "ingest" | "process" | "publish" | "maintenance";

export type CronRunStatus =
  | "success"
  | "partial"
  | "failed"
  | "skipped";

export type CronJobResult = {
  ok: boolean;
  jobType: CronJobType;
  status: CronRunStatus;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  durationMs: number;
  message: string;
  runId?: string | null;
};

export type CronAuthFailure = {
  ok: false;
  status: 401 | 503;
  message: string;
};

export type CronAuthSuccess = { ok: true };

const SAFE_CONFIG_MESSAGE = "Cron yapılandırması eksik";
const SAFE_UNAUTHORIZED_MESSAGE = "Yetkisiz";

/**
 * Reads CRON_SECRET without throwing when other server env vars are missing.
 */
export function getCronSecretSoft(): string | null {
  const value = process.env.CRON_SECRET?.trim();
  return value ? value : null;
}

/**
 * Validates Authorization: Bearer ${CRON_SECRET}.
 * - Server secret missing → 503 configuration error
 * - Missing/wrong bearer → 401
 * Never returns or logs the secret value.
 */
export function authorizeCronRequest(
  request: Request,
): CronAuthSuccess | CronAuthFailure {
  const configured = getCronSecretSoft();
  if (!configured) {
    return {
      ok: false,
      status: 503,
      message: SAFE_CONFIG_MESSAGE,
    };
  }

  const header = request.headers.get("authorization");
  if (!header || !header.startsWith("Bearer ")) {
    return {
      ok: false,
      status: 401,
      message: SAFE_UNAUTHORIZED_MESSAGE,
    };
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token || token !== configured) {
    return {
      ok: false,
      status: 401,
      message: SAFE_UNAUTHORIZED_MESSAGE,
    };
  }

  return { ok: true };
}

export function toCronHttpBody(result: CronJobResult) {
  return {
    ok: result.ok,
    jobType: result.jobType,
    status: result.status,
    processed: result.processed,
    succeeded: result.succeeded,
    failed: result.failed,
    skipped: result.skipped,
    durationMs: result.durationMs,
    message: result.message,
  };
}

export function cronAuthErrorResponse(auth: CronAuthFailure): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      jobType: null,
      status: "failed",
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      durationMs: 0,
      message: auth.message,
    },
    { status: auth.status },
  );
}

export function emptyCronResult(
  jobType: CronJobType,
  status: CronRunStatus,
  message: string,
  durationMs = 0,
): CronJobResult {
  return {
    ok: status === "success" || status === "skipped" || status === "partial",
    jobType,
    status,
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: status === "skipped" ? 1 : 0,
    durationMs,
    message,
    runId: null,
  };
}

/** Pure helper: whether a scheduled article is due for publish. */
export function isDueForPublish(
  article: { status: string; scheduled_at: string | null },
  now: Date = new Date(),
): boolean {
  if (article.status !== "scheduled") return false;
  if (!article.scheduled_at) return false;
  const at = new Date(article.scheduled_at).getTime();
  if (!Number.isFinite(at)) return false;
  return at <= now.getTime();
}

/** Pure helper: final job_runs status from counters. */
export function resolveCronRunStatus(input: {
  skippedOnly: boolean;
  succeeded: number;
  failed: number;
  processed: number;
}): CronRunStatus {
  if (input.skippedOnly) return "skipped";
  if (input.failed > 0 && input.succeeded > 0) return "partial";
  if (input.failed > 0 && input.succeeded === 0) return "failed";
  if (input.processed === 0 && input.succeeded === 0 && input.failed === 0) {
    return "success";
  }
  return "success";
}

export function requiredToggleForJob(
  jobType: CronJobType,
): Array<"automation_enabled" | "ingestion_enabled" | "publishing_enabled"> {
  switch (jobType) {
    case "ingest":
      return ["automation_enabled", "ingestion_enabled"];
    case "process":
      return ["automation_enabled"];
    case "publish":
      return ["automation_enabled", "publishing_enabled"];
    case "maintenance":
      return [];
  }
}
