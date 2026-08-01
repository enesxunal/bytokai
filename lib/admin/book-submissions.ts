import "server-only";

import {
  BOOK_GENRES,
  BOOK_SUBMISSION_STATUSES,
  type BookSubmissionStatus,
} from "@/lib/book-submissions/schema";
import { hasSupabaseEnv, getSafeClient } from "@/lib/database/safe-client";
import { createServiceClient } from "@/lib/supabase/server";

export type AdminBookSubmissionListItem = {
  id: string;
  full_name: string;
  email: string;
  book_title: string;
  book_genre: string;
  manuscript_status: string;
  status: BookSubmissionStatus;
  notification_status: string;
  created_at: string;
};

export type AdminBookSubmissionDetail = AdminBookSubmissionListItem & {
  phone: string | null;
  estimated_word_count: number | null;
  synopsis: string;
  author_bio: string;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  admin_notes: string | null;
  consent_at: string;
  notification_error: string | null;
  updated_at: string;
};

export type AdminBookSubmissionFilters = {
  q: string;
  status: string;
  genre: string;
  from: string;
  to: string;
};

export type AdminBookSubmissionsListResult =
  | {
      kind: "ok";
      items: AdminBookSubmissionListItem[];
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
      filters: AdminBookSubmissionFilters;
      dbConfigured: true;
    }
  | {
      kind: "unavailable";
      dbConfigured: false;
      message: string;
    };

function firstParam(
  value: string | string[] | undefined,
): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export function buildAdminBookSubmissionsQueryString(
  filters: AdminBookSubmissionFilters,
  page?: number,
): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("durum", filters.status);
  if (filters.genre) params.set("tur", filters.genre);
  if (filters.from) params.set("baslangic", filters.from);
  if (filters.to) params.set("bitis", filters.to);
  if (page && page > 1) params.set("sayfa", String(page));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function loadAdminBookSubmissionsList(
  searchParams: Record<string, string | string[] | undefined>,
): Promise<AdminBookSubmissionsListResult> {
  if (!hasSupabaseEnv()) {
    return {
      kind: "unavailable",
      dbConfigured: false,
      message: "Supabase yapılandırması eksik.",
    };
  }

  const filters = {
    q: firstParam(searchParams.q).trim(),
    status: firstParam(searchParams.durum).trim(),
    genre: firstParam(searchParams.tur).trim(),
    from: firstParam(searchParams.baslangic).trim(),
    to: firstParam(searchParams.bitis).trim(),
  };

  const page = Math.max(1, Number(firstParam(searchParams.sayfa) || "1") || 1);
  const pageSize = 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await getSafeClient();
  if (!supabase) {
    return {
      kind: "unavailable",
      dbConfigured: false,
      message: "Veritabanına bağlanılamadı.",
    };
  }

  let query = supabase
    .from("book_submissions")
    .select(
      "id, full_name, email, book_title, book_genre, manuscript_status, status, notification_status, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.status && (BOOK_SUBMISSION_STATUSES as readonly string[]).includes(filters.status)) {
    query = query.eq("status", filters.status);
  }
  if (filters.genre && (BOOK_GENRES as readonly string[]).includes(filters.genre)) {
    query = query.eq("book_genre", filters.genre);
  }
  if (filters.from) {
    query = query.gte("created_at", `${filters.from}T00:00:00.000Z`);
  }
  if (filters.to) {
    query = query.lte("created_at", `${filters.to}T23:59:59.999Z`);
  }
  if (filters.q) {
    const pattern = `%${filters.q}%`;
    query = query.or(
      `full_name.ilike.${pattern},email.ilike.${pattern},book_title.ilike.${pattern}`,
    );
  }

  const { data, error, count } = await query;
  if (error) {
    return {
      kind: "unavailable",
      dbConfigured: false,
      message: "Başvurular yüklenemedi.",
    };
  }

  const total = count ?? 0;
  return {
    kind: "ok",
    items: (data ?? []) as AdminBookSubmissionListItem[],
    page,
    pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    filters,
    dbConfigured: true,
  };
}

export async function getAdminBookSubmissionById(
  id: string,
): Promise<AdminBookSubmissionDetail | null> {
  const supabase = await getSafeClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("book_submissions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as AdminBookSubmissionDetail;
}

export async function createBookSubmissionSignedUrl(
  storagePath: string,
  expiresInSeconds = 120,
): Promise<string | null> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.storage
      .from("book-submissions")
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}
