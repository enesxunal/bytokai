"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Database } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  runManualAutomationJob,
  updateAutomationSettings,
} from "@/app/admin/(protected)/automation/actions";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  MAX_PROCESS_BATCH_LIMIT,
  automationSettingsSchema,
  type AutomationPageData,
  type AutomationSettingsInput,
  type ManualJobKind,
} from "@/lib/admin/automation-settings";
import { JOB_STATUS_LABELS } from "@/lib/admin/labels";
import type { DbJobRunStatus } from "@/lib/database/types";
import { formatIstanbul } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    return formatIstanbul(value, "dd MMM yyyy HH:mm");
  } catch {
    return "—";
  }
}

function formatCount(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString("tr-TR");
}

function statusBadgeVariant(
  status: string | null,
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

function ConfigRow({
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

function MetricRow({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-background/60 px-3 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium tabular-nums">
        {formatCount(value)}
      </span>
    </div>
  );
}

function ToggleStatusBadge({
  enabled,
  known,
}: {
  enabled: boolean;
  known: boolean;
}) {
  if (!known) {
    return <Badge variant="outline">Bilinmiyor</Badge>;
  }
  return (
    <Badge variant={enabled ? "success" : "secondary"}>
      {enabled ? "Açık" : "Kapalı"}
    </Badge>
  );
}

function AutomationSettingsForm({
  data,
}: {
  data: AutomationPageData;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const disabled = !data.connected;

  const form = useForm<AutomationSettingsInput>({
    resolver: zodResolver(automationSettingsSchema),
    defaultValues: data.settings,
  });

  function onSubmit(values: AutomationSettingsInput) {
    startTransition(async () => {
      const result = await updateAutomationSettings(values);
      if (!result.ok) {
        toast.error(result.message ?? "Kayıt başarısız");
        if (result.fieldErrors) {
          for (const [key, messages] of Object.entries(result.fieldErrors)) {
            form.setError(key as keyof AutomationSettingsInput, {
              message: messages[0],
            });
          }
        }
        return;
      }

      if (result.data.updatedKeys.length === 0) {
        toast.message(result.message ?? "Değişiklik yok");
      } else {
        toast.success(result.message ?? "Ayarlar kaydedildi");
      }
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card className="shadow-none">
          <CardHeader className="p-4 pb-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="font-sans text-base font-semibold">
                  Genel otomasyon durumu
                </CardTitle>
                <CardDescription>
                  Ana anahtarlar. Kapalıyken ilgili cron işleri güvenli biçimde
                  atlanır.
                </CardDescription>
              </div>
              <p className="text-xs text-muted-foreground">
                Son değişiklik:{" "}
                {data.settingsKnown
                  ? formatDate(data.settingsUpdatedAt)
                  : "Bilinmiyor"}
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-2">
            {(
              [
                {
                  name: "automation_enabled" as const,
                  label: "Otomasyon",
                  description:
                    "Tüm otomatik boru hattını tek anahtardan yönetir.",
                },
                {
                  name: "ingestion_enabled" as const,
                  label: "Kaynak tarama",
                  description:
                    "Aktif kaynaklardan haber keşfini açar veya kapatır.",
                },
                {
                  name: "publishing_enabled" as const,
                  label: "Yayınlama",
                  description:
                    "Planlanmış haberlerin otomatik yayına alınmasını yönetir.",
                },
              ] as const
            ).map((item) => (
              <FormField
                key={item.name}
                control={form.control}
                name={item.name}
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4 rounded-md border border-border bg-background/60 px-3 py-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <FormLabel className="text-sm font-medium">
                          {item.label}
                        </FormLabel>
                        <ToggleStatusBadge
                          enabled={field.value}
                          known={data.settingsKnown}
                        />
                      </div>
                      <FormDescription>{item.description}</FormDescription>
                      <FormMessage />
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={disabled || pending}
                        aria-label={item.label}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="font-sans text-base font-semibold">
              Yayın ayarları
            </CardTitle>
            <CardDescription>
              Saatler Europe/Istanbul duvar saatine göredir. Veritabanında
              tarihler UTC olarak saklanır.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 p-4 pt-2 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="daily_min_articles"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Günlük minimum haber</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      disabled={disabled || pending}
                      value={field.value}
                      onChange={(event) =>
                        field.onChange(Number(event.target.value))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="daily_max_articles"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Günlük maksimum haber</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      disabled={disabled || pending}
                      value={field.value}
                      onChange={(event) =>
                        field.onChange(Number(event.target.value))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="publish_window_start"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Yayın başlangıç saati</FormLabel>
                  <FormControl>
                    <Input
                      type="time"
                      disabled={disabled || pending}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormDescription>Europe/Istanbul</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="publish_window_end"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Yayın bitiş saati</FormLabel>
                  <FormControl>
                    <Input
                      type="time"
                      disabled={disabled || pending}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormDescription>Europe/Istanbul</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="min_publish_interval_minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum yayın aralığı (dk)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      disabled={disabled || pending}
                      value={field.value}
                      onChange={(event) =>
                        field.onChange(Number(event.target.value))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="max_per_hour"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Aynı saatte maksimum haber</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      disabled={disabled || pending}
                      value={field.value}
                      onChange={(event) =>
                        field.onChange(Number(event.target.value))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="max_process_batch"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cron başına maksimum kayıt</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      disabled={disabled || pending}
                      value={field.value}
                      onChange={(event) =>
                        field.onChange(Number(event.target.value))
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    Güvenli üst sınır: {MAX_PROCESS_BATCH_LIMIT}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="min_ai_confidence"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum AI güven skoru</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min={0}
                      max={1}
                      disabled={disabled || pending}
                      value={field.value}
                      onChange={(event) =>
                        field.onChange(Number(event.target.value))
                      }
                    />
                  </FormControl>
                  <FormDescription>0 ile 1 arasında</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={disabled || pending}>
            {pending ? "Kaydediliyor…" : "Ayarları Kaydet"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function ManualJobsPanel({ data }: { data: AutomationPageData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [runningJob, setRunningJob] = useState<ManualJobKind | null>(null);

  function runJob(job: ManualJobKind) {
    setRunningJob(job);
    startTransition(async () => {
      const result = await runManualAutomationJob(job);
      if (!result.ok) {
        toast.error(result.message ?? "İşlem başarısız");
      } else {
        toast.success(result.message ?? "İşlem tamamlandı");
      }
      setRunningJob(null);
      router.refresh();
    });
  }

  return (
    <Card className="shadow-none">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="font-sans text-base font-semibold">
          Manuel işlemler
        </CardTitle>
        <CardDescription>
          Görevler sunucu tarafında çalışır. Secret değerleri tarayıcıya
          gönderilmez.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 p-4 pt-2 sm:grid-cols-2">
        {data.manualJobs.map((item) => {
          const disabled = !data.connected || !item.ready || pending;
          return (
            <div
              key={item.job}
              className="flex flex-col gap-3 rounded-md border border-border bg-background/60 p-3"
            >
              <div className="space-y-1">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">
                  {item.ready
                    ? "Hazır — güvenli batch ile çalışır"
                    : (item.reason ?? "Henüz hazır değil")}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={disabled}
                onClick={() => runJob(item.job)}
              >
                {runningJob === item.job ? "Çalışıyor…" : "Çalıştır"}
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function AutomationView({ data }: { data: AutomationPageData }) {
  const { readiness } = data;

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">
          Otomasyon
        </h1>
        <p className="text-sm text-muted-foreground">
          Yayın boru hattı anahtarları, zamanlama kuralları ve manuel görevler.
          {!data.connected ? (
            <span className="mt-1 block text-warning">
              Veritabanı bağlantısı yok; ayarlar varsayılan durumda, işlemler
              devre dışı.
            </span>
          ) : null}
        </p>
      </div>

      {!data.connected ? (
        <EmptyState
          icon={Database}
          title="Veritabanı bağlı değil"
          description="Otomasyon ayarları ve manuel görevler için Supabase bağlantısı gerekir. Sayfa güvenli boş durumda gösteriliyor."
        />
      ) : null}

      <section aria-label="Sistem hazır olma durumu">
        <Card className="shadow-none">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="font-sans text-base font-semibold">
              Sistem hazır olma durumu
            </CardTitle>
            <CardDescription>
              Secret değerlerinin kendisi gösterilmez; yalnızca ayarlı / ayarsız
              durumu görünür.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 p-4 pt-2 sm:grid-cols-2 lg:grid-cols-3">
            <ConfigRow
              label="Supabase"
              configured={readiness.supabaseConfigured}
            />
            <ConfigRow label="Gemini" configured={readiness.geminiConfigured} />
            <ConfigRow
              label="Cron secret"
              configured={readiness.cronSecretConfigured}
            />
            <MetricRow
              label="Aktif kaynak"
              value={readiness.activeSources}
            />
            <MetricRow
              label="Planlanmış haber"
              value={readiness.scheduledArticles}
            />
            <MetricRow
              label="Kuyruktaki ham haber"
              value={readiness.pendingRawArticles}
            />
          </CardContent>
        </Card>
      </section>

      <AutomationSettingsForm
        key={data.settingsUpdatedAt ?? "defaults"}
        data={data}
      />
      <ManualJobsPanel data={data} />

      <section aria-label="Son cron sonuçları">
        <Card className="shadow-none">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="font-sans text-base font-semibold">
              Son cron sonuçları
            </CardTitle>
            <CardDescription>
              Son kaynak tarama, kuyruk, yayın ve bakım kayıtları
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {data.recentRuns.map((run) => (
                <li
                  key={run.kind}
                  className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-start"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium">{run.label}</p>
                    <p className="text-xs text-muted-foreground">
                      Başlangıç: {formatDate(run.started_at)} · Bitiş:{" "}
                      {formatDate(run.finished_at)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      İşlenen: {formatCount(run.processed)} · Başarılı:{" "}
                      {formatCount(run.success)} · Başarısız:{" "}
                      {formatCount(run.failed)}
                    </p>
                    {run.error_summary ? (
                      <p className="text-xs text-destructive">
                        {run.error_summary}
                      </p>
                    ) : null}
                  </div>
                  <Badge
                    variant={statusBadgeVariant(run.status)}
                    className="shrink-0 justify-self-start sm:justify-self-end"
                  >
                    {run.status
                      ? (JOB_STATUS_LABELS[run.status as DbJobRunStatus] ??
                        run.status)
                      : "Kayıt yok"}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
