import "server-only";

import { sanitizeErrorSummary } from "@/lib/admin/automation-settings";
import { hasSupabaseEnv, getSafeClient } from "@/lib/database/safe-client";
import { emptyPage, type DbPaginatedResult } from "@/lib/database/types";
import { istanbulWallToUtcIso } from "@/lib/utils/date";
import type { AiGenerationStatus } from "@/types";

export const ADMIN_AI_JOBS_PAGE_SIZE = 25;

export const AI_GENERATION_STATUSES = [
  "pending",
  "success",
  "failed",
] as const satisfies ReadonlyArray<AiGenerationStatus>;

export type AdminAiJobFilters = {
  status: AiGenerationStatus | null;
  model: string;
  dateFrom: string | null;
  dateTo: string | null;
  page: number;
};

export type AdminAiJobListItem = {
  id: string;
  model: string;
  status: AiGenerationStatus;
  duration_ms: number | null;
  confidence: number | null;
  error_summary: string | null;
  raw_article_id: string | null;
  article_id: string | null;
  created_at: string;
};

export type AdminAiJobsListResult = {
  connected: boolean;
  queryError: boolean;
  filters: AdminAiJobFilters;
  models: string[];
  result: DbPaginatedResult<AdminAiJobListItem>;
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

function parseStatus(
  value: string | undefined,
): AiGenerationStatus | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  return (AI_GENERATION_STATUSES as readonly string[]).includes(v)
    ? (v as AiGenerationStatus)
    : null;
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

function confidenceFromMeta(meta: unknown): number | null {
  if (!meta || typeof meta !== "object") return null;
  const value = (meta as Record<string, unknown>).confidence;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function parseAdminAiJobsSearchParams(
  params: Record<string, string | string[] | undefined>,
): AdminAiJobFilters {
  const modelRaw = firstParam(params.model)?.normalize("NFC") ?? "";
  return {
    status: parseStatus(firstParam(params.durum)),
    model: modelRaw.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, 120),
    dateFrom: parseDateOnly(firstParam(params.baslangic)),
    dateTo: parseDateOnly(firstParam(params.bitis)),
    page: parsePage(firstParam(params.sayfa)),
  };
}

export function buildAdminAiJobsQueryString(
  filters: AdminAiJobFilters,
  page?: number,
): string {
  const sp = new URLSearchParams();
  if (filters.status) sp.set("durum", filters.status);
  if (filters.model) sp.set("model", filters.model);
  if (filters.dateFrom) sp.set("baslangic", filters.dateFrom);
  if (filters.dateTo) sp.set("bitis", filters.dateTo);
  const p = page ?? filters.page;
  if (p > 1) sp.set("sayfa", String(p));
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export async function loadAdminAiJobsList(
  searchParams: Record<string, string | string[] | undefined>,
): Promise<AdminAiJobsListResult> {
  const filters = parseAdminAiJobsSearchParams(searchParams);

  if (!hasSupabaseEnv()) {
    return {
      connected: false,
      queryError: false,
      filters,
      models: [],
      result: emptyPage(filters.page, ADMIN_AI_JOBS_PAGE_SIZE),
    };
  }

  const supabase = await getSafeClient();
  if (!supabase) {
    return {
      connected: false,
      queryError: false,
      filters,
      models: [],
      result: emptyPage(filters.page, ADMIN_AI_JOBS_PAGE_SIZE),
    };
  }

  try {
    const from = (filters.page - 1) * ADMIN_AI_JOBS_PAGE_SIZE;
    const to = from + ADMIN_AI_JOBS_PAGE_SIZE - 1;

    let query = supabase
      .from("ai_generations")
      .select(
        "id, model, status, duration_ms, error_message, response_metadata, raw_article_id, article_id, created_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false });

    if (filters.status) query = query.eq("status", filters.status);
    if (filters.model) query = query.eq("model", filters.model);
    if (filters.dateFrom) {
      query = query.gte("created_at", dayStartUtcIso(filters.dateFrom));
    }
    if (filters.dateTo) {
      query = query.lte("created_at", dayEndUtcIso(filters.dateTo));
    }

    const [{ data, error, count }, modelsResult] = await Promise.all([
      query.range(from, to),
      supabase
        .from("ai_generations")
        .select("model")
        .order("model", { ascending: true })
        .limit(200),
    ]);

    if (error) {
      return {
        connected: true,
        queryError: true,
        filters,
        models: [],
        result: emptyPage(filters.page, ADMIN_AI_JOBS_PAGE_SIZE),
      };
    }

    const modelSet = new Set<string>();
    for (const row of modelsResult.data ?? []) {
      const model = row.model as string | null;
      if (model) modelSet.add(model);
    }

    const items: AdminAiJobListItem[] = (data ?? []).map((row) => ({
      id: row.id as string,
      model: row.model as string,
      status: row.status as AiGenerationStatus,
      duration_ms:
        typeof row.duration_ms === "number" ? row.duration_ms : null,
      confidence: confidenceFromMeta(row.response_metadata),
      error_summary: row.error_message
        ? sanitizeErrorSummary(row.error_message as string)
        : null,
      raw_article_id: (row.raw_article_id as string | null) ?? null,
      article_id: (row.article_id as string | null) ?? null,
      created_at: row.created_at as string,
    }));

    const total = count ?? items.length;

    return {
      connected: true,
      queryError: false,
      filters,
      models: [...modelSet].sort((a, b) => a.localeCompare(b, "tr")),
      result: {
        items,
        ...paginateMeta(total, filters.page, ADMIN_AI_JOBS_PAGE_SIZE),
      },
    };
  } catch {
    return {
      connected: true,
      queryError: true,
      filters,
      models: [],
      result: emptyPage(filters.page, ADMIN_AI_JOBS_PAGE_SIZE),
    };
  }
}
