import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Database,
} from "lucide-react";

import { CalendarItemActions } from "@/components/admin/calendar-item-actions";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ARTICLE_STATUS_LABELS } from "@/lib/admin/labels";
import {
  addDaysToDateOnly,
  buildCalendarQueryString,
  calendarAnchorAt,
  type AdminCalendarResult,
  type CalendarArticle,
  type CalendarView,
} from "@/lib/admin/calendar";
import type { DbArticleStatus } from "@/lib/database/types";
import { formatIstanbul, istanbulWallToUtcIso } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  try {
    return formatIstanbul(value, "dd MMM yyyy HH:mm");
  } catch {
    return "—";
  }
}

function formatTime(value: string | null): string {
  if (!value) return "—";
  try {
    return formatIstanbul(value, "HH:mm");
  } catch {
    return "—";
  }
}

function formatLongDate(dateOnly: string): string {
  try {
    const [y, m, d] = dateOnly.split("-").map(Number);
    return formatIstanbul(
      istanbulWallToUtcIso(y, m, d, 12, 0, 0),
      "d MMMM yyyy EEEE",
    );
  } catch {
    return dateOnly;
  }
}

function statusVariant(
  status: DbArticleStatus,
): "default" | "secondary" | "destructive" | "success" | "warning" | "outline" {
  switch (status) {
    case "published":
      return "success";
    case "scheduled":
      return "warning";
    case "failed":
      return "destructive";
    case "archived":
      return "secondary";
    case "needs_review":
      return "outline";
    default:
      return "secondary";
  }
}

const VIEW_OPTIONS: Array<{ value: CalendarView; label: string }> = [
  { value: "gun", label: "Günlük" },
  { value: "hafta", label: "Haftalık" },
  { value: "liste", label: "Liste" },
];

function CalendarToolbar({ data }: { data: AdminCalendarResult }) {
  const { filters, weekStart, weekEnd } = data;
  const prevDay = addDaysToDateOnly(filters.date, -1);
  const nextDay = addDaysToDateOnly(filters.date, 1);
  const prevWeek = addDaysToDateOnly(weekStart, -7);
  const nextWeek = addDaysToDateOnly(weekStart, 7);

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card/40 p-4">
      <div className="flex flex-wrap items-center gap-2">
        {VIEW_OPTIONS.map((option) => {
          const active = filters.view === option.value;
          return (
            <Button
              key={option.value}
              variant={active ? "default" : "outline"}
              size="sm"
              asChild
            >
              <Link
                href={`/admin/calendar${buildCalendarQueryString(filters, {
                  view: option.value,
                  page: 1,
                })}`}
                aria-current={active ? "page" : undefined}
              >
                {option.label}
              </Link>
            </Button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <form
          method="get"
          action="/admin/calendar"
          className="flex flex-wrap items-end gap-2"
        >
          {filters.view !== "gun" ? (
            <input type="hidden" name="gorunum" value={filters.view} />
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="tarih">Tarih (Europe/Istanbul)</Label>
            <Input
              id="tarih"
              name="tarih"
              type="date"
              defaultValue={filters.date}
              className="w-auto"
            />
          </div>
          <Button type="submit" size="sm" variant="secondary">
            Git
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {filters.view === "gun" ? (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/admin/calendar${buildCalendarQueryString(filters, {
                    date: prevDay,
                    page: 1,
                  })}`}
                >
                  <ChevronLeft className="size-4" aria-hidden />
                  Önceki gün
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/admin/calendar${buildCalendarQueryString(filters, {
                    date: data.today,
                    page: 1,
                  })}`}
                >
                  Bugün
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/admin/calendar${buildCalendarQueryString(filters, {
                    date: nextDay,
                    page: 1,
                  })}`}
                >
                  Sonraki gün
                  <ChevronRight className="size-4" aria-hidden />
                </Link>
              </Button>
            </>
          ) : null}

          {filters.view === "hafta" ? (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/admin/calendar${buildCalendarQueryString(filters, {
                    date: prevWeek,
                    page: 1,
                  })}`}
                >
                  <ChevronLeft className="size-4" aria-hidden />
                  Önceki hafta
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/admin/calendar${buildCalendarQueryString(filters, {
                    date: data.today,
                    page: 1,
                  })}`}
                >
                  Bu hafta
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/admin/calendar${buildCalendarQueryString(filters, {
                    date: nextWeek,
                    page: 1,
                  })}`}
                >
                  Sonraki hafta
                  <ChevronRight className="size-4" aria-hidden />
                </Link>
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {filters.view === "gun"
          ? formatLongDate(filters.date)
          : filters.view === "hafta"
            ? `${formatLongDate(weekStart)} — ${formatLongDate(weekEnd)}`
            : "Planlanmış ve yayınlanmış haberler · tarih sırası"}
      </p>
    </div>
  );
}

function ArticleCard({
  article,
  compact = false,
}: {
  article: CalendarArticle;
  compact?: boolean;
}) {
  const anchor = calendarAnchorAt(article);

  return (
    <div
      className={cn(
        "rounded-md border border-border bg-background/70 p-3",
        compact && "p-2.5",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Link
            href={`/admin/articles/${article.id}`}
            className="line-clamp-2 text-sm font-medium hover:underline"
          >
            {article.title}
          </Link>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={statusVariant(article.status)}>
              {ARTICLE_STATUS_LABELS[article.status]}
            </Badge>
            {article.category ? (
              <span className="text-xs text-muted-foreground">
                {article.category.name}
              </span>
            ) : null}
          </div>
          <dl
            className={cn(
              "grid gap-0.5 text-xs text-muted-foreground",
              compact ? "grid-cols-1" : "sm:grid-cols-2",
            )}
          >
            <div>
              <dt className="inline text-muted-foreground/80">Yazar: </dt>
              <dd className="inline">{article.author?.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="inline text-muted-foreground/80">Kaynak: </dt>
              <dd className="inline">{article.source_name ?? "—"}</dd>
            </div>
            <div>
              <dt className="inline text-muted-foreground/80">Plan: </dt>
              <dd className="inline">
                {compact
                  ? formatTime(article.scheduled_at)
                  : formatDateTime(article.scheduled_at)}
              </dd>
            </div>
            {article.status === "published" || article.published_at ? (
              <div>
                <dt className="inline text-muted-foreground/80">Yayın: </dt>
                <dd className="inline">
                  {compact
                    ? formatTime(article.published_at)
                    : formatDateTime(article.published_at)}
                </dd>
              </div>
            ) : null}
            {!article.scheduled_at && !article.published_at && anchor ? (
              <div>
                <dt className="inline text-muted-foreground/80">Zaman: </dt>
                <dd className="inline">
                  {compact ? formatTime(anchor) : formatDateTime(anchor)}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
        <CalendarItemActions article={article} />
      </div>
    </div>
  );
}

function DayView({ data }: { data: AdminCalendarResult }) {
  const total =
    data.daySlots.reduce((sum, slot) => sum + slot.articles.length, 0) +
    data.outsideWindow.length;

  if (total === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Bu gün için haber yok"
        description="Seçilen günde planlanmış veya yayınlanmış haber bulunmuyor."
      />
    );
  }

  return (
    <div className="space-y-3">
      {data.outsideWindow.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Yayın penceresi dışı
          </h2>
          <div className="space-y-2">
            {data.outsideWindow.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border">
        {data.daySlots.map((slot) => (
          <div
            key={slot.hour}
            className="grid grid-cols-[4.5rem_1fr] border-b border-border last:border-b-0"
          >
            <div className="border-r border-border bg-muted/30 px-3 py-3 text-sm font-medium tabular-nums text-muted-foreground">
              {slot.label}
            </div>
            <div className="min-h-[3.5rem] space-y-2 p-2">
              {slot.articles.length === 0 ? (
                <p className="px-1 py-2 text-xs text-muted-foreground/70">
                  Boş
                </p>
              ) : (
                slot.articles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeekView({ data }: { data: AdminCalendarResult }) {
  const total = data.weekDays.reduce(
    (sum, day) => sum + day.articles.length,
    0,
  );

  if (total === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Bu hafta için haber yok"
        description="Seçilen haftada planlanmış veya yayınlanmış haber bulunmuyor."
      />
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
      {data.weekDays.map((day) => (
        <section
          key={day.date}
          className={cn(
            "rounded-lg border border-border bg-card/30 p-3",
            day.isToday && "border-primary/40 bg-primary/5",
          )}
        >
          <div className="mb-3 space-y-0.5 border-b border-border pb-2">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {day.weekdayLabel}
            </p>
            <Link
              href={`/admin/calendar${buildCalendarQueryString(data.filters, {
                view: "gun",
                date: day.date,
                page: 1,
              })}`}
              className="text-sm font-semibold hover:underline"
            >
              {day.label}
            </Link>
            <p className="text-xs text-muted-foreground">
              {day.articles.length} haber
            </p>
          </div>
          <div className="space-y-2">
            {day.articles.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Boş
              </p>
            ) : (
              day.articles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  compact
                />
              ))
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

function ListView({ data }: { data: AdminCalendarResult }) {
  const { list, filters } = data;

  if (list.items.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Takvimde haber yok"
        description="Planlanmış veya yayınlanmış haber bulunamadı."
      />
    );
  }

  const prev = list.page > 1 ? list.page - 1 : null;
  const next = list.page < list.totalPages ? list.page + 1 : null;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[14rem]">Başlık</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Yazar</TableHead>
              <TableHead>Kaynak</TableHead>
              <TableHead>Planlanan</TableHead>
              <TableHead>Yayın</TableHead>
              <TableHead className="w-12 text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.items.map((article) => (
              <TableRow key={article.id}>
                <TableCell>
                  <Link
                    href={`/admin/articles/${article.id}`}
                    className="line-clamp-2 font-medium hover:underline"
                  >
                    {article.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant(article.status)}>
                    {ARTICLE_STATUS_LABELS[article.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {article.category?.name ?? "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {article.author?.name ?? "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {article.source_name ?? "—"}
                </TableCell>
                <TableCell className="text-sm tabular-nums text-muted-foreground">
                  {formatDateTime(article.scheduled_at)}
                </TableCell>
                <TableCell className="text-sm tabular-nums text-muted-foreground">
                  {formatDateTime(article.published_at)}
                </TableCell>
                <TableCell className="text-right">
                  <CalendarItemActions article={article} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <nav
        className="flex items-center justify-between gap-4"
        aria-label="Takvim sayfalama"
      >
        {prev ? (
          <Button variant="outline" size="sm" asChild>
            <Link
              href={`/admin/calendar${buildCalendarQueryString(filters, {
                page: prev,
              })}`}
            >
              <ChevronLeft className="size-4" aria-hidden />
              Önceki
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft className="size-4" aria-hidden />
            Önceki
          </Button>
        )}
        <p className="text-sm text-muted-foreground">
          Sayfa{" "}
          <span className="font-medium text-foreground">{list.page}</span> /{" "}
          {list.totalPages}
          <span className="ml-2 tabular-nums">
            ({list.total.toLocaleString("tr-TR")} kayıt)
          </span>
        </p>
        {next ? (
          <Button variant="outline" size="sm" asChild>
            <Link
              href={`/admin/calendar${buildCalendarQueryString(filters, {
                page: next,
              })}`}
            >
              Sonraki
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Sonraki
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        )}
      </nav>
    </div>
  );
}

export function CalendarView({ data }: { data: AdminCalendarResult }) {
  const { connected, filters } = data;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">
          Yayın Takvimi
        </h1>
        <p className="text-sm text-muted-foreground">
          Planlanmış ve yayınlanmış haberleri günlük, haftalık veya liste
          görünümünde yönetin.
          {!connected ? (
            <span className="mt-1 block text-warning">
              Veritabanı bağlantısı yok; takvim güvenli boş durumda.
            </span>
          ) : null}
        </p>
      </div>

      <CalendarToolbar data={data} />

      {!connected ? (
        <EmptyState
          icon={Database}
          title="Veritabanı bağlı değil"
          description="Supabase ortam değişkenlerini ayarladıktan sonra yayın takvimi burada görünecek. Görünüm ve tarih kontrolleri çalışmaya devam eder."
        />
      ) : filters.view === "liste" ? (
        <ListView data={data} />
      ) : filters.view === "hafta" ? (
        <WeekView data={data} />
      ) : (
        <DayView data={data} />
      )}
    </div>
  );
}
