import "server-only";

import { sanitizeErrorSummary } from "@/lib/admin/automation-settings";
import { hasSupabaseEnv, getSafeClient } from "@/lib/database/safe-client";
import { emptyPage, type DbPaginatedResult } from "@/lib/database/types";
import { istanbulWallToUtcIso } from "@/lib/utils/date";

export const ADMIN_SYSTEM_LOGS_PAGE_SIZE = 25;

export const SYSTEM_LOG_STATUSES = [
  "running",
  "success",
  "partial",
  "failed",
  "skipped",
] as const;

export type SystemLogStatus = (typeof SYSTEM_LOG_STATUSES)[number];

export type SystemLogKind = "job" | "ingestion";

export type AdminSystemLogFilters = {
  kind: SystemLogKind | "all";
  jobType: string;
  status: SystemLogStatus | null;
  dateFrom: string | null;
  dateTo: string | null;
  page: number;
};

export type AdminSystemLogItem = {
  id: string;
  kind: SystemLogKind;
  label: string;
  job_type: string | null;
  status: string;
  started_at: string;
  finished_at: string | null;
  processed: number;
  success: number;
  failure: number;
  error_summary: string | null;
};

export type AdminSystemLogsListResult = {
  connected: boolean;
  filters: AdminSystemLogFilters;
  jobTypes: string[];
  result: DbPaginatedResult<AdminSystemLogItem>;
};

const JOB_TYPE_LABELS: Record<string, string> = {
  ingest: "Kaynak tarama",
  process: "Kuyruk işleme",
  publish: "Yayınlama",
  maintenance: "Bakım",
};

function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(parsed, 10_000);
}

function parseDateOnly(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  return trimmed;
}

function parseStatus(value: string | undefined): SystemLogStatus | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  return (SYSTEM_LOG_STATUSES as readonly string[]).includes(v)
    ? (v as SystemLogStatus)
    : null;
}

function parseKind(value: string | undefined): SystemLogKind | "all" {
  if (value === "job" || value === "is") return "job";
  if (value === "ingestion" || value === "ingest") return "ingestion";
  return "all";
}

function dayStartUtcIso(dateOnly: string): string {
  const [y, m, d] = dateOnly.split("-").map(Number);
  return istanbulWallToUtcIso(y, m, d, 0, 0, 0);
}

function dayEndUtcIso(dateOnly: string): string {
  const [y, m, d] = dateOnly.split("-").map(Number);
  return istanbulWallToUtcIso(y, m, d, 23, 59, 59);
}

function paginateMeta(
  total: number,
  page: number,
  pageSize: number,
): Pick<DbPaginatedResult<unknown>, "page" | "pageSize" | "totalPages" | "total"> {
  const safePage = Math.max(1, page);
  const safeSize = Math.max(1, pageSize);
  return {
    total,
    page: safePage,
    pageSize: safeSize,
    totalPages: total === 0 ? 0 : Math.ceil(total / safeSize),
  };
}

export function parseAdminSystemLogsSearchParams(
  params: Record<string, string | string[] | undefined>,
): AdminSystemLogFilters {
  const jobTypeRaw = firstParam(params.tip)?.normalize("NFC") ?? "";
  return {
    kind: parseKind(firstParam(params.tur)),
    jobType: jobTypeRaw.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, 80),
    status: parseStatus(firstParam(params.durum)),
    dateFrom: parseDateOnly(firstParam(params.baslangic)),
    dateTo: parseDateOnly(firstParam(params.bitis)),
    page: parsePage(firstParam(params.sayfa)),
  };
}

export function buildAdminSystemLogsQueryString(
  filters: AdminSystemLogFilters,
  page?: number,
): string {
  const sp = new URLSearchParams();
  if (filters.kind === "job") sp.set("tur", "job");
  if (filters.kind === "ingestion") sp.set("tur", "ingestion");
  if (filters.jobType) sp.set("tip", filters.jobType);
  if (filters.status) sp.set("durum", filters.status);
  if (filters.dateFrom) sp.set("baslangic", filters.dateFrom);
  if (filters.dateTo) sp.set("bitis", filters.dateTo);
  const p = page ?? filters.page;
  if (p > 1) sp.set("sayfa", String(p));
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export async function loadAdminSystemLogsList(
  searchParams: Record<string, string | string[] | undefined>,
): Promise<AdminSystemLogsListResult> {
  const filters = parseAdminSystemLogsSearchParams(searchParams);

  if (!hasSupabaseEnv()) {
    return {
      connected: false,
      filters,
      jobTypes: [],
      result: emptyPage(filters.page, ADMIN_SYSTEM_LOGS_PAGE_SIZE),
    };
  }

  const supabase = await getSafeClient();
  if (!supabase) {
    return {
      connected: false,
      filters,
      jobTypes: [],
      result: emptyPage(filters.page, ADMIN_SYSTEM_LOGS_PAGE_SIZE),
    };
  }

  try {
    const fetchLimit = 400;
    const includeJobs = filters.kind === "all" || filters.kind === "job";
    const includeIngestion =
      filters.kind === "all" || filters.kind === "ingestion";

    const jobPromise = includeJobs
      ? (() => {
          let q = supabase
            .from("job_runs")
            .select(
              "id, job_type, started_at, finished_at, status, processed_count, success_count, failure_count, error_message",
            )
            .order("started_at", { ascending: false })
            .limit(fetchLimit);
          if (filters.jobType) q = q.eq("job_type", filters.jobType);
          if (filters.status) q = q.eq("status", filters.status);
          if (filters.dateFrom) {
            q = q.gte("started_at", dayStartUtcIso(filters.dateFrom));
          }
          if (filters.dateTo) {
            q = q.lte("started_at", dayEndUtcIso(filters.dateTo));
          }
          return q;
        })()
      : Promise.resolve({ data: [] as Record<string, unknown>[], error: null });

    const ingestionPromise = includeIngestion
      ? (() => {
          let q = supabase
            .from("ingestion_runs")
            .select(
              "id, source_id, started_at, finished_at, status, discovered_count, inserted_count, duplicate_count, error_message",
            )
            .order("started_at", { ascending: false })
            .limit(fetchLimit);
          if (filters.status) q = q.eq("status", filters.status);
          if (filters.dateFrom) {
            q = q.gte("started_at", dayStartUtcIso(filters.dateFrom));
          }
          if (filters.dateTo) {
            q = q.lte("started_at", dayEndUtcIso(filters.dateTo));
          }
          return q;
        })()
      : Promise.resolve({ data: [] as Record<string, unknown>[], error: null });

    const [jobsResult, ingestionResult, jobTypesResult] = await Promise.all([
      jobPromise,
      ingestionPromise,
      supabase
        .from("job_runs")
        .select("job_type")
        .order("job_type", { ascending: true })
        .limit(100),
    ]);

    const items: AdminSystemLogItem[] = [];

    for (const row of jobsResult.data ?? []) {
      const jobType = String(row.job_type ?? "");
      items.push({
        id: String(row.id),
        kind: "job",
        label: JOB_TYPE_LABELS[jobType] ?? (jobType || "İş"),
        job_type: jobType || null,
        status: String(row.status ?? ""),
        started_at: String(row.started_at),
        finished_at: (row.finished_at as string | null) ?? null,
        processed: Number(row.processed_count ?? 0),
        success: Number(row.success_count ?? 0),
        failure: Number(row.failure_count ?? 0),
        error_summary: row.error_message
          ? sanitizeErrorSummary(String(row.error_message))
          : null,
      });
    }

    for (const row of ingestionResult.data ?? []) {
      if (filters.jobType && filters.kind === "all") continue;
      const discovered = Number(row.discovered_count ?? 0);
      const inserted = Number(row.inserted_count ?? 0);
      const duplicates = Number(row.duplicate_count ?? 0);
      items.push({
        id: String(row.id),
        kind: "ingestion",
        label: "Kaynak ingest",
        job_type: null,
        status: String(row.status ?? ""),
        started_at: String(row.started_at),
        finished_at: (row.finished_at as string | null) ?? null,
        processed: discovered,
        success: inserted,
        failure: Math.max(0, discovered - inserted - duplicates),
        error_summary: row.error_message
          ? sanitizeErrorSummary(String(row.error_message))
          : null,
      });
    }

    items.sort(
      (a, b) =>
        new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
    );

    const total = items.length;
    const from = (filters.page - 1) * ADMIN_SYSTEM_LOGS_PAGE_SIZE;
    const pageItems = items.slice(from, from + ADMIN_SYSTEM_LOGS_PAGE_SIZE);

    const typeSet = new Set<string>();
    for (const row of jobTypesResult.data ?? []) {
      const t = row.job_type as string | null;
      if (t) typeSet.add(t);
    }

    return {
      connected: true,
      filters,
      jobTypes: [...typeSet].sort(),
      result: {
        items: pageItems,
        ...paginateMeta(total, filters.page, ADMIN_SYSTEM_LOGS_PAGE_SIZE),
      },
    };
  } catch {
    return {
      connected: false,
      filters,
      jobTypes: [],
      result: emptyPage(filters.page, ADMIN_SYSTEM_LOGS_PAGE_SIZE),
    };
  }
}
