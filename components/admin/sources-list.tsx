import Link from "next/link";
import { AlertTriangle, Database, Plus } from "lucide-react";

import { SourceActions } from "@/components/admin/source-actions";
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
  buildAdminSourcesQueryString,
  INGESTION_TYPE_LABELS,
  INGESTION_TYPES,
  isSourceProblematic,
  type AdminSourcesListResult,
} from "@/lib/admin/sources";
import type { DbSource } from "@/lib/database/types";
import { formatIstanbul } from "@/lib/utils/date";
import { extractDomain } from "@/lib/utils/url";
import { cn } from "@/lib/utils/cn";

function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    return formatIstanbul(value, "dd MMM yyyy HH:mm");
  } catch {
    return "—";
  }
}

function domainOf(url: string): string {
  try {
    return extractDomain(url);
  } catch {
    return url;
  }
}

function SourcesFilters({ data }: { data: AdminSourcesListResult }) {
  const { filters } = data;
  const aktifDefault =
    filters.enabled === true ? "evet" : filters.enabled === false ? "hayir" : "";
  const hataDefault =
    filters.hasError === true ? "var" : filters.hasError === false ? "yok" : "";

  return (
    <form
      method="get"
      action="/admin/sources"
      className="grid gap-3 rounded-lg border border-border bg-card/40 p-4 sm:grid-cols-2 lg:grid-cols-5"
    >
      <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
        <Label htmlFor="q">Arama</Label>
        <Input
          id="q"
          name="q"
          defaultValue={filters.q}
          placeholder="Ad, slug, URL…"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="aktif">Aktiflik</Label>
        <select
          id="aktif"
          name="aktif"
          defaultValue={aktifDefault}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
        >
          <option value="">Tümü</option>
          <option value="evet">Aktif</option>
          <option value="hayir">Pasif</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tur">Ingestion türü</Label>
        <select
          id="tur"
          name="tur"
          defaultValue={filters.ingestionType ?? ""}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
        >
          <option value="">Tümü</option>
          {INGESTION_TYPES.map((type) => (
            <option key={type} value={type}>
              {INGESTION_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
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
          <option value="var">Sorunlu</option>
          <option value="yok">Sağlıklı</option>
        </select>
      </div>

      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-5">
        <Button type="submit" size="sm">
          Filtrele
        </Button>
        <Button type="button" variant="outline" size="sm" asChild>
          <Link href="/admin/sources">Temizle</Link>
        </Button>
      </div>
    </form>
  );
}

function SourcesPagination({ data }: { data: AdminSourcesListResult }) {
  const { filters, result } = data;
  if (result.totalPages <= 1) return null;

  const prev = result.page > 1 ? result.page - 1 : null;
  const next = result.page < result.totalPages ? result.page + 1 : null;

  return (
    <nav
      className="flex items-center justify-between gap-4"
      aria-label="Kaynak sayfalama"
    >
      {prev ? (
        <Button variant="outline" size="sm" asChild>
          <Link
            href={`/admin/sources${buildAdminSourcesQueryString(filters, prev)}`}
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
            href={`/admin/sources${buildAdminSourcesQueryString(filters, next)}`}
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

function SourceMobileCard({ source }: { source: DbSource }) {
  const problematic = isSourceProblematic(source);

  return (
    <article
      className={cn(
        "rounded-lg border border-border bg-card/40 p-4",
        problematic && "border-destructive/40 bg-destructive/5",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/admin/sources/${source.id}`}
              className="font-medium hover:underline"
            >
              {source.name}
            </Link>
            {problematic ? (
              <Badge variant="destructive">
                <AlertTriangle className="size-3" aria-hidden />
                Sorunlu
              </Badge>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            {domainOf(source.homepage_url)}
          </p>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <div>
              <dt className="inline">Tür: </dt>
              <dd className="inline">
                {INGESTION_TYPE_LABELS[source.ingestion_type]}
              </dd>
            </div>
            <div>
              <dt className="inline">Öncelik: </dt>
              <dd className="inline tabular-nums">{source.priority}</dd>
            </div>
            <div>
              <dt className="inline">Durum: </dt>
              <dd className="inline">
                {source.enabled ? "Aktif" : "Pasif"}
              </dd>
            </div>
            <div>
              <dt className="inline">Hata: </dt>
              <dd className="inline tabular-nums">
                {source.consecutive_failures}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="inline">Son kontrol: </dt>
              <dd className="inline">{formatDate(source.last_checked_at)}</dd>
            </div>
            <div className="col-span-2">
              <dt className="inline">Son başarı: </dt>
              <dd className="inline">{formatDate(source.last_success_at)}</dd>
            </div>
            <div className="col-span-2 truncate">
              <dt className="inline">Feed: </dt>
              <dd className="inline">{source.feed_url ?? "—"}</dd>
            </div>
          </dl>
        </div>
        <SourceActions
          id={source.id}
          name={source.name}
          enabled={source.enabled}
          consecutiveFailures={source.consecutive_failures}
        />
      </div>
    </article>
  );
}

export function SourcesListView({ data }: { data: AdminSourcesListResult }) {
  const { connected, result } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-sans text-2xl font-semibold tracking-tight">
            Kaynaklar
          </h1>
          <p className="text-sm text-muted-foreground">
            Haber kaynaklarını yönetin, sağlık durumunu izleyin ve manuel kontrol
            çalıştırın.
            {!connected ? (
              <span className="mt-1 block text-warning">
                Veritabanı bağlantısı yok; liste güvenli boş durumda.
              </span>
            ) : null}
          </p>
        </div>
        <Button size="sm" asChild>
          <Link href="/admin/sources/new">
            <Plus className="size-3.5" aria-hidden />
            Yeni kaynak
          </Link>
        </Button>
      </div>

      <SourcesFilters data={data} />

      {!connected ? (
        <EmptyState
          icon={Database}
          title="Veritabanı bağlı değil"
          description="Supabase ortam değişkenlerini ayarladıktan sonra kaynak listesi burada görünecek."
        />
      ) : result.items.length === 0 ? (
        <EmptyState
          title="Kaynak bulunamadı"
          description="Filtrelere uyan kaynak yok. Filtreleri temizleyerek tekrar deneyin."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/sources">Filtreleri temizle</Link>
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
                    <TableHead className="min-w-[12rem]">Ad</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Tür</TableHead>
                    <TableHead>Feed URL</TableHead>
                    <TableHead>Aktiflik</TableHead>
                    <TableHead>Öncelik</TableHead>
                    <TableHead>Son kontrol</TableHead>
                    <TableHead>Son başarı</TableHead>
                    <TableHead>Hata</TableHead>
                    <TableHead className="w-12 text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.items.map((source) => {
                    const problematic = isSourceProblematic(source);
                    return (
                      <TableRow
                        key={source.id}
                        className={cn(
                          problematic && "bg-destructive/5",
                        )}
                      >
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Link
                              href={`/admin/sources/${source.id}`}
                              className="font-medium hover:underline"
                            >
                              {source.name}
                            </Link>
                            {problematic ? (
                              <span className="inline-flex items-center gap-1 text-xs text-destructive">
                                <AlertTriangle className="size-3" aria-hidden />
                                Sorunlu kaynak
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {domainOf(source.homepage_url)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {INGESTION_TYPE_LABELS[source.ingestion_type]}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[12rem] truncate text-sm text-muted-foreground">
                          {source.feed_url ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={source.enabled ? "success" : "secondary"}
                          >
                            {source.enabled ? "Aktif" : "Pasif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="tabular-nums text-sm">
                          {source.priority}
                        </TableCell>
                        <TableCell className="text-sm tabular-nums text-muted-foreground">
                          {formatDate(source.last_checked_at)}
                        </TableCell>
                        <TableCell className="text-sm tabular-nums text-muted-foreground">
                          {formatDate(source.last_success_at)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "tabular-nums text-sm",
                            source.consecutive_failures > 0 &&
                              "font-medium text-destructive",
                          )}
                        >
                          {source.consecutive_failures}
                        </TableCell>
                        <TableCell className="text-right">
                          <SourceActions
                            id={source.id}
                            name={source.name}
                            enabled={source.enabled}
                            consecutiveFailures={source.consecutive_failures}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            {result.items.map((source) => (
              <SourceMobileCard key={source.id} source={source} />
            ))}
          </div>

          <SourcesPagination data={data} />
        </>
      )}
    </div>
  );
}
