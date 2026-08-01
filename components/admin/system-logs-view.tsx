import Link from "next/link";
import { Database } from "lucide-react";

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
import { JOB_STATUS_LABELS } from "@/lib/admin/labels";
import {
  SYSTEM_LOG_STATUSES,
  buildAdminSystemLogsQueryString,
  type AdminSystemLogsListResult,
} from "@/lib/admin/system-logs";
import { formatIstanbul } from "@/lib/utils/date";

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

function Filters({ data }: { data: AdminSystemLogsListResult }) {
  const { filters, jobTypes } = data;
  return (
    <form
      method="get"
      action="/admin/logs"
      className="grid gap-3 rounded-lg border border-border bg-card/40 p-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <div className="space-y-1.5">
        <Label htmlFor="tur">Kayıt türü</Label>
        <select
          id="tur"
          name="tur"
          defaultValue={
            filters.kind === "all" ? "" : filters.kind
          }
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
        >
          <option value="">Tümü</option>
          <option value="job">Cron işleri</option>
          <option value="ingestion">Kaynak ingest</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tip">İş tipi</Label>
        <select
          id="tip"
          name="tip"
          defaultValue={filters.jobType}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
        >
          <option value="">Tümü</option>
          {jobTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="durum">Durum</Label>
        <select
          id="durum"
          name="durum"
          defaultValue={filters.status ?? ""}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
        >
          <option value="">Tümü</option>
          {SYSTEM_LOG_STATUSES.map((status) => (
            <option key={status} value={status}>
              {JOB_STATUS_LABELS[status] ?? status}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="baslangic">Başlangıç</Label>
        <Input
          id="baslangic"
          name="baslangic"
          type="date"
          defaultValue={filters.dateFrom ?? ""}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="bitis">Bitiş</Label>
        <Input
          id="bitis"
          name="bitis"
          type="date"
          defaultValue={filters.dateTo ?? ""}
        />
      </div>

      <div className="flex items-end gap-2">
        <Button type="submit" size="sm">
          Filtrele
        </Button>
        <Button type="button" variant="outline" size="sm" asChild>
          <Link href="/admin/logs">Temizle</Link>
        </Button>
      </div>
    </form>
  );
}

function Pagination({ data }: { data: AdminSystemLogsListResult }) {
  const { filters, result } = data;
  if (result.totalPages <= 1) return null;
  const prev = result.page > 1 ? result.page - 1 : null;
  const next = result.page < result.totalPages ? result.page + 1 : null;

  return (
    <nav
      className="flex items-center justify-between gap-4"
      aria-label="Sistem logları sayfalama"
    >
      {prev ? (
        <Button variant="outline" size="sm" asChild>
          <Link
            href={`/admin/logs${buildAdminSystemLogsQueryString(filters, prev)}`}
          >
            Önceki
          </Link>
        </Button>
      ) : (
        <span />
      )}
      <p className="text-xs text-muted-foreground">
        Sayfa {result.page} / {result.totalPages}
      </p>
      {next ? (
        <Button variant="outline" size="sm" asChild>
          <Link
            href={`/admin/logs${buildAdminSystemLogsQueryString(filters, next)}`}
          >
            Sonraki
          </Link>
        </Button>
      ) : (
        <span />
      )}
    </nav>
  );
}

export function SystemLogsView({ data }: { data: AdminSystemLogsListResult }) {
  const { connected, result } = data;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">
          Sistem Logları
        </h1>
        <p className="text-sm text-muted-foreground">
          Cron işleri ve kaynak ingest kayıtları.
          {connected ? (
            <span className="ml-1">
              ({result.total.toLocaleString("tr-TR")} kayıt)
            </span>
          ) : null}
        </p>
      </div>

      {!connected ? (
        <EmptyState
          icon={Database}
          title="Veritabanı bağlı değil"
          description="Sistem loglarını görmek için Supabase bağlantısı gerekir."
        />
      ) : (
        <>
          <Filters data={data} />
          {result.items.length === 0 ? (
            <EmptyState
              icon={Database}
              title="Kayıt bulunamadı"
              description="Filtrelere uyan job veya ingest kaydı yok."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tür</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Başlangıç</TableHead>
                    <TableHead>Bitiş</TableHead>
                    <TableHead>İşlenen</TableHead>
                    <TableHead>Başarılı</TableHead>
                    <TableHead>Başarısız</TableHead>
                    <TableHead>Hata</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.items.map((item) => (
                    <TableRow key={`${item.kind}-${item.id}`}>
                      <TableCell className="text-sm">
                        <div className="font-medium">{item.label}</div>
                        {item.job_type ? (
                          <div className="font-mono text-[0.65rem] text-muted-foreground">
                            {item.job_type}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(item.status)}>
                          {JOB_STATUS_LABELS[item.status] ?? item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {formatDate(item.started_at)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {formatDate(item.finished_at)}
                      </TableCell>
                      <TableCell className="tabular-nums text-xs">
                        {item.processed}
                      </TableCell>
                      <TableCell className="tabular-nums text-xs">
                        {item.success}
                      </TableCell>
                      <TableCell className="tabular-nums text-xs">
                        {item.failure}
                      </TableCell>
                      <TableCell className="max-w-[14rem] truncate text-xs text-muted-foreground">
                        {item.error_summary ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <Pagination data={data} />
        </>
      )}
    </div>
  );
}
