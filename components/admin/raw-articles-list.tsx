import Link from "next/link";
import { Database } from "lucide-react";

import { RawArticleActions } from "@/components/admin/raw-article-actions";
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
import { RAW_STATUS_LABELS } from "@/lib/admin/labels";
import {
  buildAdminRawArticlesQueryString,
  RAW_ARTICLE_STATUSES,
  type AdminRawArticlesListResult,
} from "@/lib/admin/raw-articles";
import type { DbRawArticleStatus } from "@/lib/database/types";
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
  status: DbRawArticleStatus,
): "default" | "secondary" | "destructive" | "success" | "warning" | "outline" {
  switch (status) {
    case "processed":
      return "success";
    case "pending":
      return "warning";
    case "processing":
      return "secondary";
    case "failed":
      return "destructive";
    case "rejected":
      return "outline";
    default:
      return "secondary";
  }
}

function truncateError(value: string | null): string {
  if (!value) return "—";
  return value.length > 80 ? `${value.slice(0, 80)}…` : value;
}

function RawFilters({ data }: { data: AdminRawArticlesListResult }) {
  const { filters, options } = data;
  const hataDefault =
    filters.hasError === true ? "var" : filters.hasError === false ? "yok" : "";

  return (
    <form
      method="get"
      action="/admin/raw-articles"
      className="grid gap-3 rounded-lg border border-border bg-card/40 p-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
        <Label htmlFor="q">Arama</Label>
        <Input
          id="q"
          name="q"
          defaultValue={filters.q}
          placeholder="Başlık, özet, URL, hata…"
        />
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
          {RAW_ARTICLE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {RAW_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="kaynak">Kaynak</Label>
        <select
          id="kaynak"
          name="kaynak"
          defaultValue={filters.sourceId ?? ""}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
        >
          <option value="">Tümü</option>
          {options.sources.map((source) => (
            <option key={source.id} value={source.id}>
              {source.name}
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

      <div className="space-y-1.5">
        <Label htmlFor="hata">Hata durumu</Label>
        <select
          id="hata"
          name="hata"
          defaultValue={hataDefault}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
        >
          <option value="">Tümü</option>
          <option value="var">Hatalı</option>
          <option value="yok">Hatasız</option>
        </select>
      </div>

      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
        <Button type="submit" size="sm">
          Filtrele
        </Button>
        <Button type="button" variant="outline" size="sm" asChild>
          <Link href="/admin/raw-articles">Temizle</Link>
        </Button>
      </div>
    </form>
  );
}

function RawPagination({ data }: { data: AdminRawArticlesListResult }) {
  const { result, filters } = data;
  if (result.totalPages <= 1) return null;

  const prev = result.page > 1 ? result.page - 1 : null;
  const next = result.page < result.totalPages ? result.page + 1 : null;

  return (
    <nav
      className="flex items-center justify-between gap-4"
      aria-label="Sayfalama"
    >
      {prev ? (
        <Button variant="outline" size="sm" asChild>
          <Link
            href={`/admin/raw-articles${buildAdminRawArticlesQueryString(filters, prev)}`}
          >
            Önceki
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          Önceki
        </Button>
      )}
      <p className="text-sm text-muted-foreground">
        Sayfa{" "}
        <span className="font-medium text-foreground">{result.page}</span> /{" "}
        {result.totalPages}
        <span className="ml-2 tabular-nums">
          ({result.total.toLocaleString("tr-TR")} kayıt)
        </span>
      </p>
      {next ? (
        <Button variant="outline" size="sm" asChild>
          <Link
            href={`/admin/raw-articles${buildAdminRawArticlesQueryString(filters, next)}`}
          >
            Sonraki
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          Sonraki
        </Button>
      )}
    </nav>
  );
}

export function RawArticlesListView({
  data,
}: {
  data: AdminRawArticlesListResult;
}) {
  const { connected, result } = data;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">
          Ham Haberler
        </h1>
        <p className="text-sm text-muted-foreground">
          Kaynaklardan bulunan ham kayıtları inceleyin ve pipeline durumunu
          yönetin.
          {!connected ? (
            <span className="mt-1 block text-warning">
              Veritabanı bağlantısı yok; liste güvenli boş durumda.
            </span>
          ) : null}
        </p>
      </div>

      <RawFilters data={data} />

      {!connected ? (
        <EmptyState
          icon={Database}
          title="Veritabanı bağlı değil"
          description="Supabase ortam değişkenlerini ayarladıktan sonra ham haber listesi burada görünecek."
        />
      ) : result.items.length === 0 ? (
        <EmptyState
          title="Ham haber bulunamadı"
          description="Filtrelere uyan kayıt yok. Filtreleri temizleyerek tekrar deneyin."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/raw-articles">Filtreleri temizle</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="hidden md:block">
            <div className="overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[14rem]">
                      Orijinal başlık
                    </TableHead>
                    <TableHead>Kaynak</TableHead>
                    <TableHead>Bulunma</TableHead>
                    <TableHead>Orijinal yayın</TableHead>
                    <TableHead>Pipeline</TableHead>
                    <TableHead>Hata sayısı</TableHead>
                    <TableHead>Son hata</TableHead>
                    <TableHead className="w-12 text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Link
                          href={`/admin/raw-articles/${item.id}`}
                          className="line-clamp-2 font-medium hover:underline"
                        >
                          {item.original_title || "(Başlıksız)"}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.source?.name ?? "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDate(item.discovered_at)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDate(item.original_published_at)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(item.status)}>
                          {RAW_STATUS_LABELS[item.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {item.failure_count}
                      </TableCell>
                      <TableCell
                        className="max-w-[12rem] truncate text-xs text-muted-foreground"
                        title={item.last_error ?? undefined}
                      >
                        {truncateError(item.last_error)}
                      </TableCell>
                      <TableCell className="text-right">
                        <RawArticleActions
                          id={item.id}
                          title={item.original_title || "Ham haber"}
                          status={item.status}
                          originalUrl={item.original_url}
                          linkedArticleId={null}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <ul className="space-y-3 md:hidden">
            {result.items.map((item) => (
              <li
                key={item.id}
                className={cn("rounded-lg border border-border bg-card/40 p-4")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-2">
                    <Link
                      href={`/admin/raw-articles/${item.id}`}
                      className="line-clamp-2 text-sm font-semibold hover:underline"
                    >
                      {item.original_title || "(Başlıksız)"}
                    </Link>
                    <Badge variant={statusVariant(item.status)}>
                      {RAW_STATUS_LABELS[item.status]}
                    </Badge>
                    <dl className="grid gap-1 text-xs text-muted-foreground">
                      <div>
                        <dt className="inline">Kaynak: </dt>
                        <dd className="inline">{item.source?.name ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="inline">Bulunma: </dt>
                        <dd className="inline">
                          {formatDate(item.discovered_at)}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline">Orijinal yayın: </dt>
                        <dd className="inline">
                          {formatDate(item.original_published_at)}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline">Hata: </dt>
                        <dd className="inline">
                          {item.failure_count} · {truncateError(item.last_error)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <RawArticleActions
                    id={item.id}
                    title={item.original_title || "Ham haber"}
                    status={item.status}
                    originalUrl={item.original_url}
                    linkedArticleId={null}
                  />
                </div>
              </li>
            ))}
          </ul>

          <RawPagination data={data} />
        </>
      )}
    </div>
  );
}
