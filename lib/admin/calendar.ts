import "server-only";

import { hasSupabaseEnv, getSafeClient } from "@/lib/database/safe-client";
import {
  emptyPage,
  type DbArticleStatus,
  type DbAuthor,
  type DbCategory,
  type DbPaginatedResult,
} from "@/lib/database/types";
import {
  istanbulWallToUtcIso,
  toIstanbul,
} from "@/lib/utils/date";

export const CALENDAR_LIST_PAGE_SIZE = 30;
export const CALENDAR_DAY_START_HOUR = 8;
export const CALENDAR_DAY_END_HOUR = 23;

export type CalendarView = "gun" | "hafta" | "liste";

export type CalendarArticle = {
  id: string;
  title: string;
  status: DbArticleStatus;
  scheduled_at: string | null;
  published_at: string | null;
  source_name: string | null;
  category: Pick<DbCategory, "id" | "name"> | null;
  author: Pick<DbAuthor, "id" | "name"> | null;
};

export type CalendarFilters = {
  view: CalendarView;
  date: string;
  page: number;
};

export type CalendarDaySlot = {
  hour: number;
  label: string;
  articles: CalendarArticle[];
};

export type CalendarWeekDay = {
  date: string;
  label: string;
  weekdayLabel: string;
  isToday: boolean;
  articles: CalendarArticle[];
};

export type AdminCalendarResult = {
  connected: boolean;
  filters: CalendarFilters;
  today: string;
  weekStart: string;
  weekEnd: string;
  daySlots: CalendarDaySlot[];
  outsideWindow: CalendarArticle[];
  weekDays: CalendarWeekDay[];
  list: DbPaginatedResult<CalendarArticle>;
};

const CALENDAR_SELECT = `
  id,
  title,
  status,
  scheduled_at,
  published_at,
  source_name,
  category:categories(id, name),
  author:authors(id, name)
`;

type CalendarRow = {
  id: string;
  title: string;
  status: DbArticleStatus;
  scheduled_at: string | null;
  published_at: string | null;
  source_name: string | null;
  category:
    | Pick<DbCategory, "id" | "name">
    | Pick<DbCategory, "id" | "name">[]
    | null;
  author:
    | Pick<DbAuthor, "id" | "name">
    | Pick<DbAuthor, "id" | "name">[]
    | null;
};

const WEEKDAY_LABELS = [
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
  "Pazar",
] as const;

function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseView(value: string | undefined): CalendarView {
  if (value === "hafta" || value === "liste" || value === "gun") return value;
  return "gun";
}

function parseDateOnly(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const [y, m, d] = trimmed.split("-").map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (
    probe.getUTCFullYear() !== y ||
    probe.getUTCMonth() !== m - 1 ||
    probe.getUTCDate() !== d
  ) {
    return null;
  }
  return trimmed;
}

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(parsed, 10_000);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function istanbulTodayDateOnly(now = new Date()): string {
  const parts = toIstanbul(now);
  return `${parts.getUTCFullYear()}-${pad2(parts.getUTCMonth() + 1)}-${pad2(parts.getUTCDate())}`;
}

export function addDaysToDateOnly(dateOnly: string, days: number): string {
  const [y, m, d] = dateOnly.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return `${next.getUTCFullYear()}-${pad2(next.getUTCMonth() + 1)}-${pad2(next.getUTCDate())}`;
}

export function mondayOfWeek(dateOnly: string): string {
  const [y, m, d] = dateOnly.split("-").map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  const dow = probe.getUTCDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  return addDaysToDateOnly(dateOnly, offset);
}

export function sundayOfWeek(dateOnly: string): string {
  return addDaysToDateOnly(mondayOfWeek(dateOnly), 6);
}

function dateOnlyStartUtc(dateOnly: string): string {
  const [y, m, d] = dateOnly.split("-").map(Number);
  return istanbulWallToUtcIso(y, m, d, 0, 0, 0);
}

function dateOnlyEndExclusiveUtc(dateOnly: string): string {
  return dateOnlyStartUtc(addDaysToDateOnly(dateOnly, 1));
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

function mapCalendarRow(row: CalendarRow): CalendarArticle {
  const category = Array.isArray(row.category)
    ? (row.category[0] ?? null)
    : row.category;
  const author = Array.isArray(row.author)
    ? (row.author[0] ?? null)
    : row.author;

  return {
    id: row.id,
    title: row.title,
    status: row.status,
    scheduled_at: row.scheduled_at,
    published_at: row.published_at,
    source_name: row.source_name,
    category,
    author,
  };
}

/** Takvimde kartın konumlanacağı UTC anı. */
export function calendarAnchorAt(article: CalendarArticle): string | null {
  if (article.status === "scheduled" && article.scheduled_at) {
    return article.scheduled_at;
  }
  if (article.status === "published" && article.published_at) {
    return article.published_at;
  }
  return article.scheduled_at ?? article.published_at;
}

export function istanbulHourOf(iso: string): number | null {
  try {
    return toIstanbul(iso).getUTCHours();
  } catch {
    return null;
  }
}

export function parseCalendarSearchParams(
  params: Record<string, string | string[] | undefined>,
): CalendarFilters {
  const today = istanbulTodayDateOnly();
  return {
    view: parseView(firstParam(params.gorunum)),
    date: parseDateOnly(firstParam(params.tarih)) ?? today,
    page: parsePage(firstParam(params.sayfa)),
  };
}

export function buildCalendarQueryString(
  filters: Pick<CalendarFilters, "view" | "date" | "page">,
  overrides?: Partial<CalendarFilters>,
): string {
  const view = overrides?.view ?? filters.view;
  const date = overrides?.date ?? filters.date;
  const page = overrides?.page ?? filters.page;
  const today = istanbulTodayDateOnly();

  const sp = new URLSearchParams();
  if (view !== "gun") sp.set("gorunum", view);
  if (date !== today) sp.set("tarih", date);
  if (page > 1) sp.set("sayfa", String(page));
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

function rangeOrFilter(startUtc: string, endUtc: string): string {
  return [
    `and(status.eq.scheduled,scheduled_at.gte.${startUtc},scheduled_at.lt.${endUtc})`,
    `and(status.eq.published,published_at.gte.${startUtc},published_at.lt.${endUtc})`,
  ].join(",");
}

function emptyCalendarResult(filters: CalendarFilters): AdminCalendarResult {
  const weekStart = mondayOfWeek(filters.date);
  const weekEnd = sundayOfWeek(filters.date);
  const today = istanbulTodayDateOnly();

  return {
    connected: false,
    filters,
    today,
    weekStart,
    weekEnd,
    daySlots: buildEmptyDaySlots(),
    outsideWindow: [],
    weekDays: buildEmptyWeekDays(weekStart, today),
    list: emptyPage(filters.page, CALENDAR_LIST_PAGE_SIZE),
  };
}

function buildEmptyDaySlots(): CalendarDaySlot[] {
  const slots: CalendarDaySlot[] = [];
  for (let hour = CALENDAR_DAY_START_HOUR; hour <= CALENDAR_DAY_END_HOUR; hour += 1) {
    slots.push({
      hour,
      label: `${pad2(hour)}:00`,
      articles: [],
    });
  }
  return slots;
}

function buildEmptyWeekDays(weekStart: string, today: string): CalendarWeekDay[] {
  return WEEKDAY_LABELS.map((weekdayLabel, index) => {
    const date = addDaysToDateOnly(weekStart, index);
    const [, m, d] = date.split("-").map(Number);
    return {
      date,
      label: `${pad2(d)}.${pad2(m)}`,
      weekdayLabel,
      isToday: date === today,
      articles: [],
    };
  });
}

function buildDaySlots(
  articles: CalendarArticle[],
): { slots: CalendarDaySlot[]; outsideWindow: CalendarArticle[] } {
  const slots = buildEmptyDaySlots();
  const byHour = new Map<number, CalendarArticle[]>();
  const outsideWindow: CalendarArticle[] = [];

  for (const article of articles) {
    const anchor = calendarAnchorAt(article);
    if (!anchor) {
      outsideWindow.push(article);
      continue;
    }
    const hour = istanbulHourOf(anchor);
    if (
      hour === null ||
      hour < CALENDAR_DAY_START_HOUR ||
      hour > CALENDAR_DAY_END_HOUR
    ) {
      outsideWindow.push(article);
      continue;
    }
    const bucket = byHour.get(hour) ?? [];
    bucket.push(article);
    byHour.set(hour, bucket);
  }

  for (const slot of slots) {
    const bucket = byHour.get(slot.hour) ?? [];
    bucket.sort((a, b) => {
      const aAt = calendarAnchorAt(a) ?? "";
      const bAt = calendarAnchorAt(b) ?? "";
      return aAt.localeCompare(bAt);
    });
    slot.articles = bucket;
  }

  outsideWindow.sort((a, b) => {
    const aAt = calendarAnchorAt(a) ?? "";
    const bAt = calendarAnchorAt(b) ?? "";
    return aAt.localeCompare(bAt);
  });

  return { slots, outsideWindow };
}

function buildWeekDays(
  weekStart: string,
  today: string,
  articles: CalendarArticle[],
): CalendarWeekDay[] {
  const days = buildEmptyWeekDays(weekStart, today);
  const byDate = new Map<string, CalendarArticle[]>();

  for (const article of articles) {
    const anchor = calendarAnchorAt(article);
    if (!anchor) continue;
    try {
      const parts = toIstanbul(anchor);
      const key = `${parts.getUTCFullYear()}-${pad2(parts.getUTCMonth() + 1)}-${pad2(parts.getUTCDate())}`;
      const bucket = byDate.get(key) ?? [];
      bucket.push(article);
      byDate.set(key, bucket);
    } catch {
      // skip invalid timestamps
    }
  }

  for (const day of days) {
    const bucket = byDate.get(day.date) ?? [];
    bucket.sort((a, b) => {
      const aAt = calendarAnchorAt(a) ?? "";
      const bAt = calendarAnchorAt(b) ?? "";
      return aAt.localeCompare(bAt);
    });
    day.articles = bucket;
  }

  return days;
}

async function loadRangeArticles(
  startUtc: string,
  endUtc: string,
): Promise<CalendarArticle[]> {
  const supabase = await getSafeClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("articles")
    .select(CALENDAR_SELECT)
    .or(rangeOrFilter(startUtc, endUtc))
    .limit(500);

  if (error || !data) return [];

  return (data as CalendarRow[]).map(mapCalendarRow);
}

async function loadListArticles(
  page: number,
): Promise<DbPaginatedResult<CalendarArticle>> {
  const supabase = await getSafeClient();
  if (!supabase) {
    return emptyPage(page, CALENDAR_LIST_PAGE_SIZE);
  }

  const need = page * CALENDAR_LIST_PAGE_SIZE;

  const [scheduledRes, publishedRes, scheduledCountRes, publishedCountRes] =
    await Promise.all([
      supabase
        .from("articles")
        .select(CALENDAR_SELECT)
        .eq("status", "scheduled")
        .not("scheduled_at", "is", null)
        .order("scheduled_at", { ascending: true })
        .limit(need),
      supabase
        .from("articles")
        .select(CALENDAR_SELECT)
        .eq("status", "published")
        .not("published_at", "is", null)
        .order("published_at", { ascending: true })
        .limit(need),
      supabase
        .from("articles")
        .select("id", { count: "exact", head: true })
        .eq("status", "scheduled")
        .not("scheduled_at", "is", null),
      supabase
        .from("articles")
        .select("id", { count: "exact", head: true })
        .eq("status", "published")
        .not("published_at", "is", null),
    ]);

  if (scheduledRes.error || publishedRes.error) {
    return emptyPage(page, CALENDAR_LIST_PAGE_SIZE);
  }

  const scheduled = ((scheduledRes.data ?? []) as CalendarRow[]).map(
    mapCalendarRow,
  );
  const published = ((publishedRes.data ?? []) as CalendarRow[]).map(
    mapCalendarRow,
  );

  const merged: CalendarArticle[] = [];
  let i = 0;
  let j = 0;
  while (i < scheduled.length || j < published.length) {
    const a = scheduled[i];
    const b = published[j];
    if (!b || (a && (a.scheduled_at ?? "") <= (b.published_at ?? ""))) {
      if (a) merged.push(a);
      i += 1;
    } else {
      merged.push(b);
      j += 1;
    }
  }

  const total =
    (scheduledCountRes.count ?? 0) + (publishedCountRes.count ?? 0);
  const from = (page - 1) * CALENDAR_LIST_PAGE_SIZE;
  const items = merged.slice(from, from + CALENDAR_LIST_PAGE_SIZE);

  return {
    items,
    ...paginateMeta(total, page, CALENDAR_LIST_PAGE_SIZE),
  };
}

export async function loadAdminCalendar(
  searchParams: Record<string, string | string[] | undefined>,
): Promise<AdminCalendarResult> {
  const filters = parseCalendarSearchParams(searchParams);
  const today = istanbulTodayDateOnly();
  const weekStart = mondayOfWeek(filters.date);
  const weekEnd = sundayOfWeek(filters.date);

  if (!hasSupabaseEnv()) {
    return emptyCalendarResult(filters);
  }

  const supabase = await getSafeClient();
  if (!supabase) {
    return emptyCalendarResult(filters);
  }

  try {
    if (filters.view === "liste") {
      const list = await loadListArticles(filters.page);
      return {
        connected: true,
        filters,
        today,
        weekStart,
        weekEnd,
        daySlots: buildEmptyDaySlots(),
        outsideWindow: [],
        weekDays: buildEmptyWeekDays(weekStart, today),
        list,
      };
    }

    if (filters.view === "hafta") {
      const articles = await loadRangeArticles(
        dateOnlyStartUtc(weekStart),
        dateOnlyEndExclusiveUtc(weekEnd),
      );
      return {
        connected: true,
        filters,
        today,
        weekStart,
        weekEnd,
        daySlots: buildEmptyDaySlots(),
        outsideWindow: [],
        weekDays: buildWeekDays(weekStart, today, articles),
        list: emptyPage(1, CALENDAR_LIST_PAGE_SIZE),
      };
    }

    const articles = await loadRangeArticles(
      dateOnlyStartUtc(filters.date),
      dateOnlyEndExclusiveUtc(filters.date),
    );
    const { slots, outsideWindow } = buildDaySlots(articles);

    return {
      connected: true,
      filters,
      today,
      weekStart,
      weekEnd,
      daySlots: slots,
      outsideWindow,
      weekDays: buildEmptyWeekDays(weekStart, today),
      list: emptyPage(1, CALENDAR_LIST_PAGE_SIZE),
    };
  } catch {
    return emptyCalendarResult(filters);
  }
}
