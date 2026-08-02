import Link from "next/link";

import { DashboardTrafficChart } from "@/components/admin/dashboard-traffic-chart";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { JOB_STATUS_LABELS } from "@/lib/admin/labels";
import type {
  DashboardOverview,
  DashboardTopArticle,
} from "@/lib/admin/dashboard";
import { formatIstanbul } from "@/lib/utils/date";
import type { DbJobRunStatus } from "@/lib/database/types";
import { cn } from "@/lib/utils/cn";

function formatMetric(value: number | null, suffix = ""): string {
  if (value === null) return "—";
  return `${value.toLocaleString("tr-TR")}${suffix}`;
}

function formatDuration(totalSeconds: number | null): string {
  if (totalSeconds === null) return "—";
  const seconds = Math.max(0, Math.round(totalSeconds));
  if (seconds < 60) return `${seconds} sn`;
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  if (minutes < 60) {
    return rem > 0 ? `${minutes} dk ${rem} sn` : `${minutes} dk`;
  }
  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  return remMin > 0 ? `${hours} sa ${remMin} dk` : `${hours} sa`;
}

function formatCron(value: string | null): string {
  if (!value) return "—";
  try {
    return formatIstanbul(value, "dd MMM yyyy HH:mm");
  } catch {
    return "—";
  }
}

function statusBadgeVariant(
  status: string,
): "default" | "secondary" | "destructive" | "success" | "warning" | "outline" {
  switch (status) {
    case "success":
      return "success";
    case "failed":
      return "destructive";
    case "partial":
      return "warning";
    case "running":
      return "secondary";
    default:
      return "outline";
  }
}

function StatusDot({
  label,
  state,
}: {
  label: string;
  state: "on" | "off" | "unknown";
}) {
  const text =
    state === "on" ? "Açık" : state === "off" ? "Kapalı" : "—";

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-background/60 px-3 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="inline-flex items-center gap-2 text-sm font-medium">
        <span
          className={cn(
            "size-2 rounded-full",
            state === "on" && "bg-success",
            state === "off" && "bg-destructive",
            state === "unknown" && "bg-muted-foreground/40",
          )}
          aria-hidden
        />
        {text}
      </span>
    </div>
  );
}

function ConfigDot({
  label,
  configured,
}: {
  label: string;
  configured: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-background/60 px-3 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="inline-flex items-center gap-2 text-sm font-medium">
        <span
          className={cn(
            "size-2 rounded-full",
            configured ? "bg-success" : "bg-warning",
          )}
          aria-hidden
        />
        {configured ? "Ayarlı" : "Ayarsız"}
      </span>
    </div>
  );
}

function toToggleState(value: boolean | null): "on" | "off" | "unknown" {
  if (value === null) return "unknown";
  return value ? "on" : "off";
}

const TRAFFIC_KPIS: Array<{
  key: string;
  label: string;
  hint: string;
  format: (traffic: DashboardOverview["traffic"]) => string;
}> = [
  {
    key: "visitorsToday",
    label: "Bugün ziyaretçi",
    hint: "Benzersiz",
    format: (t) => formatMetric(t.visitorsToday),
  },
  {
    key: "pageViewsToday",
    label: "Bugün görüntüleme",
    hint: "Sayfa açılışı",
    format: (t) => formatMetric(t.pageViewsToday),
  },
  {
    key: "avgDurationTodaySeconds",
    label: "Ort. kalış",
    hint: "Sayfa başına",
    format: (t) => formatDuration(t.avgDurationTodaySeconds),
  },
  {
    key: "visitorsLast7Days",
    label: "7 gün ziyaretçi",
    hint: "Benzersiz",
    format: (t) => formatMetric(t.visitorsLast7Days),
  },
];

const STAT_CARDS: Array<{
  key: keyof DashboardOverview["stats"];
  label: string;
  hint: string;
  format?: (value: number | null, stats: DashboardOverview["stats"]) => string;
}> = [
  {
    key: "discoveredToday",
    label: "Bugün bulunan haber",
    hint: "Ham haber keşfi",
  },
  {
    key: "generatedToday",
    label: "Bugün üretilen haber",
    hint: "Oluşturulan makale",
  },
  {
    key: "publishedToday",
    label: "Bugün yayınlanan haber",
    hint: "Yayına alınan",
  },
  {
    key: "scheduledCount",
    label: "Planlanmış haber",
    hint: "Bekleyen yayın",
  },
  {
    key: "failedCount",
    label: "Başarısız işlem",
    hint: "Bugünkü hatalar",
  },
  {
    key: "activeSources",
    label: "Aktif kaynak",
    hint: "Açık kaynaklar",
  },
  {
    key: "lastSuccessfulCron",
    label: "Son başarılı cron",
    hint: "Job çalışması",
    format: (_value, stats) => formatCron(stats.lastSuccessfulCron),
  },
  {
    key: "aiSuccessRate",
    label: "AI başarı oranı",
    hint: "Üretim başarısı",
    format: (value) =>
      value === null ? "—" : `%${value.toLocaleString("tr-TR")}`,
  },
];

function TopArticlesBars({
  title,
  description,
  items,
  mode,
}: {
  title: string;
  description: string;
  items: DashboardTopArticle[];
  mode: "views" | "time";
}) {
  const maxValue = Math.max(
    1,
    ...items.map((item) => (mode === "views" ? item.views : item.totalSeconds)),
  );

  return (
    <Card className="shadow-none">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="font-sans text-base font-semibold">
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        {items.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            Henüz yeterli veri yok. Site ziyaretleri kaydedildikçe burada
            görünecek.
          </p>
        ) : (
          <ol className="space-y-4">
            {items.map((item, index) => {
              const value =
                mode === "views" ? item.views : item.totalSeconds;
              const width = Math.max(4, (value / maxValue) * 100);

              return (
                <li key={`${mode}-${item.articleId}`} className="space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 w-4 shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                          {index + 1}
                        </span>
                        <Link
                          href={`/haber/${item.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="line-clamp-2 text-sm font-medium transition-colors hover:text-primary"
                        >
                          {item.title}
                        </Link>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                      {mode === "views"
                        ? `${item.views.toLocaleString("tr-TR")} okuma`
                        : formatDuration(item.totalSeconds)}
                    </span>
                  </div>
                  <div
                    className="ml-6 h-1.5 overflow-hidden rounded-full bg-muted"
                    role="meter"
                    aria-label={item.title}
                    aria-valuenow={value}
                    aria-valuemin={0}
                    aria-valuemax={maxValue}
                  >
                    <div
                      className={cn(
                        "h-full rounded-full",
                        mode === "views"
                          ? "bg-[var(--chart-1)]"
                          : "bg-[var(--chart-2)]",
                      )}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <p className="ml-6 text-[11px] text-muted-foreground">
                    {mode === "views"
                      ? `ort. ${formatDuration(item.avgSeconds)}`
                      : `${item.views.toLocaleString("tr-TR")} okuma`}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardOverviewView({ data }: { data: DashboardOverview }) {
  const {
    stats,
    traffic,
    pipelineBars,
    recentJobRuns,
    recentIngestionRuns,
    systemStatus,
  } = data;
  const maxBar = Math.max(1, ...pipelineBars.map((bar) => bar.value));

  return (
    <div className="space-y-10">
      <div className="space-y-1">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">
          Genel Bakış
        </h1>
        <p className="text-sm text-muted-foreground">
          Site trafiği, yayın boru hattı ve otomasyon özeti.
          {!data.connected ? (
            <span className="mt-1 block text-warning">
              Veritabanı bağlantısı yok; metrikler güvenli boş durumda.
            </span>
          ) : null}
        </p>
      </div>

      <section aria-label="Site trafiği" className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-sans text-lg font-semibold tracking-tight">
            Site trafiği
          </h2>
          <p className="text-sm text-muted-foreground">
            Günlük özet ve son 7 günün trendi.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {TRAFFIC_KPIS.map((card) => (
            <Card key={card.key} className="shadow-none">
              <CardHeader className="space-y-1 p-4 pb-2">
                <CardDescription className="text-xs font-medium tracking-wide uppercase">
                  {card.label}
                </CardDescription>
                <CardTitle className="font-sans text-2xl font-semibold tabular-nums">
                  {card.format(traffic)}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-xs text-muted-foreground">{card.hint}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="shadow-none">
          <CardHeader className="flex flex-col gap-3 p-4 pb-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="font-sans text-base font-semibold">
                7 günlük trafik
              </CardTitle>
              <CardDescription>
                Ziyaretçi ve sayfa görüntüleme trendi
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="size-2 rounded-full bg-[var(--chart-1)]"
                  aria-hidden
                />
                Ziyaretçi
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="size-2 rounded-full bg-[var(--chart-2)]"
                  aria-hidden
                />
                Görüntüleme
              </span>
              <span className="tabular-nums">
                {formatMetric(traffic.pageViewsLast7Days)} görüntüleme ·{" "}
                {formatDuration(traffic.totalDurationTodaySeconds)} bugün
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <DashboardTrafficChart data={traffic.daily} />
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <TopArticlesBars
            title="En çok okunan yazılar"
            description="Son 7 günde en fazla görüntülenen haberler"
            items={traffic.topByViews}
            mode="views"
          />
          <TopArticlesBars
            title="En çok vakit geçirilen yazılar"
            description="Son 7 günde en uzun okunan haberler"
            items={traffic.topByTime}
            mode="time"
          />
        </div>
      </section>

      <section aria-label="Yayın istatistikleri" className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-sans text-lg font-semibold tracking-tight">
            Yayın boru hattı
          </h2>
          <p className="text-sm text-muted-foreground">
            Haber üretimi ve otomasyon metrikleri.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {STAT_CARDS.map((card) => {
            const raw = stats[card.key];
            const display = card.format
              ? card.format(
                  typeof raw === "number" ? raw : null,
                  stats,
                )
              : formatMetric(typeof raw === "number" ? raw : null);

            return (
              <Card key={card.key} className="shadow-none">
                <CardHeader className="space-y-1 p-4 pb-2">
                  <CardDescription className="text-xs font-medium tracking-wide uppercase">
                    {card.label}
                  </CardDescription>
                  <CardTitle className="font-sans text-2xl font-semibold tabular-nums">
                    {display}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-xs text-muted-foreground">{card.hint}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section aria-label="Bugünkü dağılım" className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="font-sans text-base font-semibold">
              Bugünkü boru hattı
            </CardTitle>
            <CardDescription>
              Bulunan, üretilen ve yayınlanan haber dağılımı
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-2">
            {pipelineBars.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              pipelineBars.map((bar) => (
                <div key={bar.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{bar.label}</span>
                    <span className="font-medium tabular-nums">
                      {bar.value.toLocaleString("tr-TR")}
                    </span>
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-muted"
                    role="meter"
                    aria-label={bar.label}
                    aria-valuenow={bar.value}
                    aria-valuemin={0}
                    aria-valuemax={maxBar}
                  >
                    <div
                      className="h-full rounded-full bg-gradient-brand"
                      style={{
                        width: `${Math.max(
                          bar.value > 0 ? 4 : 0,
                          (bar.value / maxBar) * 100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="font-sans text-base font-semibold">
              Sistem durumu
            </CardTitle>
            <CardDescription>
              Otomasyon bayrakları ve kritik yapılandırma
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 p-4 pt-2 sm:grid-cols-2">
            <StatusDot
              label="Ingestion"
              state={toToggleState(systemStatus.ingestionEnabled)}
            />
            <StatusDot
              label="Publishing"
              state={toToggleState(systemStatus.publishingEnabled)}
            />
            <StatusDot
              label="Automation"
              state={toToggleState(systemStatus.automationEnabled)}
            />
            <ConfigDot label="Gemini" configured={systemStatus.geminiConfigured} />
            <ConfigDot
              label="Supabase"
              configured={systemStatus.supabaseConfigured}
            />
          </CardContent>
        </Card>
      </section>

      <section aria-label="Son işlemler" className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="font-sans text-base font-semibold">
              Son job run kayıtları
            </CardTitle>
            <CardDescription>Cron ve arka plan işleri</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {recentJobRuns.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                Kayıt yok
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {recentJobRuns.map((run) => (
                  <li
                    key={run.id}
                    className="flex items-start justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="truncate font-mono text-xs font-medium uppercase tracking-wide">
                        {run.job_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatCron(run.started_at)}
                        {run.processed_count > 0
                          ? ` · ${run.success_count}/${run.processed_count}`
                          : null}
                      </p>
                    </div>
                    <Badge
                      variant={statusBadgeVariant(run.status)}
                      className="shrink-0"
                    >
                      {JOB_STATUS_LABELS[run.status as DbJobRunStatus] ??
                        run.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="font-sans text-base font-semibold">
              Son ingestion run kayıtları
            </CardTitle>
            <CardDescription>Kaynak tarama sonuçları</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {recentIngestionRuns.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                Kayıt yok
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {recentIngestionRuns.map((run) => (
                  <li
                    key={run.id}
                    className="flex items-start justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-medium">
                        {run.source_name ?? "Kaynak yok"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatCron(run.started_at)}
                        {` · +${run.inserted_count} / ${run.discovered_count}`}
                      </p>
                    </div>
                    <Badge
                      variant={statusBadgeVariant(run.status)}
                      className="shrink-0"
                    >
                      {JOB_STATUS_LABELS[run.status as DbJobRunStatus] ??
                        run.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
