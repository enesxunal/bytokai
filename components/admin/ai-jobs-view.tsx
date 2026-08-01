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
import {
  AI_GENERATION_STATUSES,
  buildAdminAiJobsQueryString,
  type AdminAiJobsListResult,
} from "@/lib/admin/ai-jobs";
import { formatIstanbul } from "@/lib/utils/date";

const STATUS_LABELS: Record<string, string> = {
  pending: "Bekliyor",
  success: "Başarılı",
  failed: "Başarısız",
};

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
    case "pending":
      return "warning";
    default:
      return "outline";
  }
}

function Filters({ data }: { data: AdminAiJobsListResult }) {
  const { filters, models } = data;
  return (
    <form
      method="get"
      action="/admin/ai-jobs"
      className="grid gap-3 rounded-lg border border-border bg-card/40 p-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <div className="space-y-1.5">
        <Label htmlFor="durum">Durum</Label>
        <select
          id="durum"
          name="durum"
          defaultValue={filters.status ?? ""}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
        >
          <option value="">Tümü</option>
          {AI_GENERATION_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status] ?? status}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="model">Model</Label>
        <select
          id="model"
          name="model"
          defaultValue={filters.model}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
        >
          <option value="">Tümü</option>
          {models.map((model) => (
            <option key={model} value={model}>
              {model}
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

      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
        <Button type="submit" size="sm">
          Filtrele
        </Button>
        <Button type="button" variant="outline" size="sm" asChild>
          <Link href="/admin/ai-jobs">Temizle</Link>
        </Button>
      </div>
    </form>
  );
}

function Pagination({ data }: { data: AdminAiJobsListResult }) {
  const { filters, result } = data;
  if (result.totalPages <= 1) return null;
  const prev = result.page > 1 ? result.page - 1 : null;
  const next = result.page < result.totalPages ? result.page + 1 : null;

  return (
    <nav
      className="flex items-center justify-between gap-4"
      aria-label="AI işlemleri sayfalama"
    >
      {prev ? (
        <Button variant="outline" size="sm" asChild>
          <Link
            href={`/admin/ai-jobs${buildAdminAiJobsQueryString(filters, prev)}`}
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
            href={`/admin/ai-jobs${buildAdminAiJobsQueryString(filters, next)}`}
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

export function AiJobsView({ data }: { data: AdminAiJobsListResult }) {
  const { connected, queryError, result } = data;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">
          AI İşlemleri
        </h1>
        <p className="text-sm text-muted-foreground">
          Gemini üretim kayıtları, süre, güven skoru ve hata özetleri.
          {connected && !queryError ? (
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
          description="AI işlem kayıtlarını görmek için Supabase bağlantısı gerekir."
        />
      ) : queryError ? (
        <EmptyState
          icon={Database}
          title="Kayıtlar yüklenemedi"
          description="AI işlemleri sorgusu tamamlanamadı. Sayfayı yenileyip tekrar deneyin."
        />
      ) : (
        <>
          <Filters data={data} />
          {result.items.length === 0 ? (
            <EmptyState
              icon={Database}
              title="Kayıt bulunamadı"
              description="Filtrelere uyan AI üretim kaydı yok."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Süre</TableHead>
                    <TableHead>Güven</TableHead>
                    <TableHead>Bağlantılar</TableHead>
                    <TableHead>Hata</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {formatDate(item.created_at)}
                      </TableCell>
                      <TableCell className="max-w-[10rem] truncate font-mono text-xs">
                        {item.model}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(item.status)}>
                          {STATUS_LABELS[item.status] ?? item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums text-xs">
                        {item.duration_ms == null
                          ? "—"
                          : `${item.duration_ms} ms`}
                      </TableCell>
                      <TableCell className="tabular-nums text-xs">
                        {item.confidence == null
                          ? "—"
                          : `%${Math.round(item.confidence * 100)}`}
                      </TableCell>
                      <TableCell className="space-x-2 text-xs">
                        {item.raw_article_id ? (
                          <Link
                            href={`/admin/raw-articles/${item.raw_article_id}`}
                            className="text-primary hover:underline"
                          >
                            Ham
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">Ham</span>
                        )}
                        {item.article_id ? (
                          <Link
                            href={`/admin/articles/${item.article_id}`}
                            className="text-primary hover:underline"
                          >
                            Haber
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">Haber</span>
                        )}
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
