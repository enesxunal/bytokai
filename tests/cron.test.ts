import { afterEach, describe, expect, it, vi } from "vitest";

import {
  authorizeCronRequest,
  emptyCronResult,
  isDueForPublish,
  requiredToggleForJob,
  resolveCronRunStatus,
  toCronHttpBody,
} from "@/lib/cron/auth";

const executeCronJob = vi.fn();

vi.mock("@/lib/cron/runner", async () => {
  const actualAuth = await vi.importActual<typeof import("@/lib/cron/auth")>(
    "@/lib/cron/auth",
  );
  return {
    executeCronJob: (...args: unknown[]) => executeCronJob(...args),
    handleCronRoute: async (request: Request, jobType: "ingest") => {
      const auth = actualAuth.authorizeCronRequest(request);
      if (!auth.ok) {
        return new Response(
          JSON.stringify({ ok: false, status: auth.status }),
          { status: auth.status },
        );
      }
      const result = await executeCronJob(jobType, { trigger: "vercel_cron" });
      return new Response(JSON.stringify(result), { status: 200 });
    },
  };
});

describe("authorizeCronRequest", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    executeCronJob.mockReset();
  });

  it("secret yok (header) → 401", () => {
    vi.stubEnv("CRON_SECRET", "test-secret-value");
    const request = new Request("http://localhost/api/cron/ingest");
    const result = authorizeCronRequest(request);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
      expect(result.message).not.toMatch(/test-secret/i);
    }
  });

  it("yanlış secret → 401", () => {
    vi.stubEnv("CRON_SECRET", "test-secret-value");
    const request = new Request("http://localhost/api/cron/ingest", {
      headers: { Authorization: "Bearer wrong-secret" },
    });
    const result = authorizeCronRequest(request);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
    }
  });

  it("doğru secret → runner çağrılır", async () => {
    vi.stubEnv("CRON_SECRET", "test-secret-value");
    executeCronJob.mockResolvedValue(
      emptyCronResult("ingest", "success", "ok"),
    );

    const { handleCronRoute } = await import("@/lib/cron/runner");
    const request = new Request("http://localhost/api/cron/ingest", {
      headers: { Authorization: "Bearer test-secret-value" },
    });
    const response = await handleCronRoute(request, "ingest");
    expect(response.status).toBe(200);
    expect(executeCronJob).toHaveBeenCalledWith("ingest", {
      trigger: "vercel_cron",
    });
  });

  it("sunucu secret eksik → 503", () => {
    vi.stubEnv("CRON_SECRET", "");
    const request = new Request("http://localhost/api/cron/ingest", {
      headers: { Authorization: "Bearer anything" },
    });
    const result = authorizeCronRequest(request);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(503);
      expect(result.message).toMatch(/yapılandırma/i);
    }
  });
});

describe("resolveCronRunStatus / lock skipped", () => {
  it("lock alınamıyor senaryosu → skipped", () => {
    const status = resolveCronRunStatus({
      skippedOnly: true,
      succeeded: 0,
      failed: 0,
      processed: 0,
    });
    expect(status).toBe("skipped");
    const body = toCronHttpBody(
      emptyCronResult("ingest", "skipped", "Aynı iş zaten çalışıyor"),
    );
    expect(body.status).toBe("skipped");
    expect(body.ok).toBe(true);
    expect(body.skipped).toBe(1);
  });

  it("toggle kapalı için required toggles", () => {
    expect(requiredToggleForJob("ingest")).toEqual([
      "automation_enabled",
      "ingestion_enabled",
    ]);
    expect(requiredToggleForJob("publish")).toEqual([
      "automation_enabled",
      "publishing_enabled",
    ]);
    expect(requiredToggleForJob("process")).toEqual(["automation_enabled"]);
    expect(requiredToggleForJob("maintenance")).toEqual([]);
  });

  it("partial ve failed ayrımı", () => {
    expect(
      resolveCronRunStatus({
        skippedOnly: false,
        succeeded: 2,
        failed: 1,
        processed: 3,
      }),
    ).toBe("partial");
    expect(
      resolveCronRunStatus({
        skippedOnly: false,
        succeeded: 0,
        failed: 2,
        processed: 2,
      }),
    ).toBe("failed");
  });
});

describe("publish idempotency yardımcısı", () => {
  const now = new Date("2026-08-01T12:00:00.000Z");

  it("yalnızca scheduled ve zamanı gelmiş kayıtları kabul eder", () => {
    expect(
      isDueForPublish(
        { status: "scheduled", scheduled_at: "2026-08-01T11:00:00.000Z" },
        now,
      ),
    ).toBe(true);

    expect(
      isDueForPublish(
        { status: "scheduled", scheduled_at: "2026-08-01T13:00:00.000Z" },
        now,
      ),
    ).toBe(false);

    expect(
      isDueForPublish(
        { status: "published", scheduled_at: "2026-08-01T11:00:00.000Z" },
        now,
      ),
    ).toBe(false);

    expect(
      isDueForPublish({ status: "scheduled", scheduled_at: null }, now),
    ).toBe(false);
  });

  it("aynı haber ikinci kez due olmaz (published)", () => {
    const first = isDueForPublish(
      { status: "scheduled", scheduled_at: "2026-08-01T10:00:00.000Z" },
      now,
    );
    const second = isDueForPublish(
      { status: "published", scheduled_at: "2026-08-01T10:00:00.000Z" },
      now,
    );
    expect(first).toBe(true);
    expect(second).toBe(false);
  });
});
