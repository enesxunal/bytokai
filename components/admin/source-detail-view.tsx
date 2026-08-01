import Link from "next/link";
import { Database, ExternalLink } from "lucide-react";

import { SourceActions } from "@/components/admin/source-actions";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { JOB_STATUS_LABELS } from "@/lib/admin/labels";
import {
  INGESTION_TYPE_LABELS,
  isSourceProblematic,
  type AdminSourceDetailResult,
} from "@/lib/admin/sources";
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

function statusVariant(
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

function ExternalUrl({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="inline-flex items-center gap-1.5 break-all text-sm text-primary hover:underline"
    >
      {label}
      <ExternalLink className="size-3.5 shrink-0" aria-hidden />
    </a>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1 border-b border-border py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

export function SourceDetailView({ data }: { data: AdminSourceDetailResult }) {
  const { connected, source, recentRuns, rawArticleCount } = data;

  if (!connected) {
    return (
      <div className="space-y-6">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">
          Kaynak detayı
        </h1>
        <EmptyState
          icon={Database}
          title="Veritabanı bağlı değil"
          description="Supabase ortam değişkenlerini ayarladıktan sonra kaynak detayı burada görünecek."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/sources">Listeye dön</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (!source) {
    return null;
  }

  const problematic = isSourceProblematic(source);
  const lastFailedRun = recentRuns.find((run) => run.status === "failed");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-sans text-2xl font-semibold tracking-tight">
              {source.name}
            </h1>
            <Badge variant={source.enabled ? "success" : "secondary"}>
              {source.enabled ? "Aktif" : "Pasif"}
            </Badge>
            <Badge variant="outline">
              {INGESTION_TYPE_LABELS[source.ingestion_type]}
            </Badge>
            {problematic ? (
              <Badge variant="destructive">Sorunlu</Badge>
            ) : null}
          </div>
          <p className="font-mono text-sm text-muted-foreground">
            {source.slug}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/sources">Listeye dön</Link>
        </Button>
      </div>

      <SourceActions
        id={source.id}
        name={source.name}
        enabled={source.enabled}
        consecutiveFailures={source.consecutive_failures}
        rawArticleCount={rawArticleCount}
        variant="toolbar"
      />

      <section className="rounded-lg border border-border bg-card/40 px-4">
        <dl>
          <DetailRow label="Ad">{source.name}</DetailRow>
          <DetailRow label="Slug">
            <span className="font-mono">{source.slug}</span>
          </DetailRow>
          <DetailRow label="Ana site">
            <ExternalUrl href={source.homepage_url} label={source.homepage_url} />
          </DetailRow>
          <DetailRow label="Bölüm URL">
            <ExternalUrl href={source.section_url} label={source.section_url} />
          </DetailRow>
          <DetailRow label="Feed URL">
            {source.feed_url ? (
              <ExternalUrl href={source.feed_url} label={source.feed_url} />
            ) : (
              "—"
            )}
          </DetailRow>
          <DetailRow label="Ingestion türü">
            {INGESTION_TYPE_LABELS[source.ingestion_type]}
          </DetailRow>
          <DetailRow label="Aktiflik">
            {source.enabled ? "Aktif" : "Pasif"}
          </DetailRow>
          <DetailRow label="Öncelik">
            <span className="tabular-nums">{source.priority}</span>
          </DetailRow>
          <DetailRow label="Varsayılan dil">
            <span className="uppercase">{source.default_language}</span>
          </DetailRow>
          <DetailRow label="Son kontrol">
            {formatDate(source.last_checked_at)}
          </DetailRow>
          <DetailRow label="Son başarı">
            {formatDate(source.last_success_at)}
          </DetailRow>
          <DetailRow label="Son hata zamanı">
            {formatDate(source.last_error_at)}
          </DetailRow>
          <DetailRow label="Art arda hata">
            <span
              className={cn(
                "tabular-nums",
                source.consecutive_failures > 0 && "font-medium text-destructive",
              )}
            >
              {source.consecutive_failures}
            </span>
          </DetailRow>
          <DetailRow label="Oluşturulma">
            {formatDate(source.created_at)}
          </DetailRow>
          <DetailRow label="Güncellenme">
            {formatDate(source.updated_at)}
          </DetailRow>
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="font-sans text-lg font-semibold tracking-tight">
          Son hata özeti
        </h2>
        <div className="rounded-lg border border-border bg-card/40 p-4 text-sm text-muted-foreground">
          {lastFailedRun?.error_message ||
            (source.last_error_at
              ? `Son hata: ${formatDate(source.last_error_at)}. Art arda ${source.consecutive_failures} başarısız kontrol.`
              : "Kayıtlı bir hata özeti yok.")}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-sans text-lg font-semibold tracking-tight">
          Son ingestion run kayıtları
        </h2>
        {recentRuns.length === 0 ? (
          <EmptyState
            title="Henüz run yok"
            description="Bu kaynak için henüz ingestion run kaydı bulunmuyor. “Şimdi kontrol et” ile bir kayıt oluşturabilirsiniz."
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Başlangıç</TableHead>
                  <TableHead>Bitiş</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Keşfedilen</TableHead>
                  <TableHead>Eklenen</TableHead>
                  <TableHead>Tekrar</TableHead>
                  <TableHead>Hata</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentRuns.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="text-sm tabular-nums">
                      {formatDate(run.started_at)}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {formatDate(run.finished_at)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(run.status)}>
                        {JOB_STATUS_LABELS[run.status as DbJobRunStatus] ??
                          run.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums text-sm">
                      {run.discovered_count}
                    </TableCell>
                    <TableCell className="tabular-nums text-sm">
                      {run.inserted_count}
                    </TableCell>
                    <TableCell className="tabular-nums text-sm">
                      {run.duplicate_count}
                    </TableCell>
                    <TableCell className="max-w-[16rem] truncate text-sm text-muted-foreground">
                      {run.error_message ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
