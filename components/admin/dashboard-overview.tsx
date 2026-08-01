import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { JOB_STATUS_LABELS } from "@/lib/admin/labels";
import type { DashboardOverview } from "@/lib/admin/dashboard";
import { formatIstanbul } from "@/lib/utils/date";
import type { DbJobRunStatus } from "@/lib/database/types";
import { cn } from "@/lib/utils/cn";

function formatMetric(value: number | null, suffix = ""): string {
  if (value === null) return "—";
  return `${value.toLocaleString("tr-TR")}${suffix}`;
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

export function DashboardOverviewView({ data }: { data: DashboardOverview }) {
  const { stats, pipelineBars, recentJobRuns, recentIngestionRuns, systemStatus } =
    data;
  const maxBar = Math.max(1, ...pipelineBars.map((bar) => bar.value));

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">
          Genel Bakış
        </h1>
        <p className="text-sm text-muted-foreground">
          Yayın boru hattı, otomasyon durumu ve son işlem özeti.
          {!data.connected ? (
            <span className="mt-1 block text-warning">
              Veritabanı bağlantısı yok; metrikler güvenli boş durumda.
            </span>
          ) : null}
        </p>
      </div>

      <section aria-label="İstatistikler">
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
