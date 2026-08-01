import Link from "next/link";
import { Database, Plus } from "lucide-react";

import { TagActions } from "@/components/admin/tag-actions";
import { EmptyState } from "@/components/shared/empty-state";
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
  buildAdminTagsQueryString,
  type AdminTagListItem,
  type AdminTagsListResult,
} from "@/lib/admin/tags";
import { formatIstanbul } from "@/lib/utils/date";

function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    return formatIstanbul(value, "dd MMM yyyy");
  } catch {
    return "—";
  }
}

function TagsFilters({ data }: { data: AdminTagsListResult }) {
  const { filters } = data;
  const usageDefault =
    filters.usage === "used"
      ? "kullanilan"
      : filters.usage === "unused"
        ? "kullanilmayan"
        : "";

  return (
    <form
      method="get"
      action="/admin/tags"
      className="grid gap-3 rounded-lg border border-border bg-card/40 p-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="q">Arama</Label>
        <Input
          id="q"
          name="q"
          defaultValue={filters.q}
          placeholder="Ad veya slug…"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="kullanim">Kullanım durumu</Label>
        <select
          id="kullanim"
          name="kullanim"
          defaultValue={usageDefault}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
        >
          <option value="">Tümü</option>
          <option value="kullanilan">Kullanılan</option>
          <option value="kullanilmayan">Kullanılmayan</option>
        </select>
      </div>

      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
        <Button type="submit" size="sm">
          Filtrele
        </Button>
        <Button type="button" variant="outline" size="sm" asChild>
          <Link href="/admin/tags">Temizle</Link>
        </Button>
      </div>
    </form>
  );
}

function TagsPagination({ data }: { data: AdminTagsListResult }) {
  const { filters, result } = data;
  if (result.totalPages <= 1) return null;

  const prev = result.page > 1 ? result.page - 1 : null;
  const next = result.page < result.totalPages ? result.page + 1 : null;

  return (
    <nav
      className="flex items-center justify-between gap-4"
      aria-label="Etiket sayfalama"
    >
      {prev ? (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/tags${buildAdminTagsQueryString(filters, prev)}`}>
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
          <Link href={`/admin/tags${buildAdminTagsQueryString(filters, next)}`}>
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

function TagMobileCard({ tag }: { tag: AdminTagListItem }) {
  return (
    <article className="rounded-lg border border-border bg-card/40 p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-2">
          <Link
            href={`/admin/tags/${tag.id}`}
            className="font-medium hover:underline"
          >
            {tag.name}
          </Link>
          <p className="font-mono text-xs text-muted-foreground">{tag.slug}</p>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <div>
              <dt className="inline">Yayın: </dt>
              <dd className="inline tabular-nums">{tag.article_count}</dd>
            </div>
            <div>
              <dt className="inline">Oluşturulma: </dt>
              <dd className="inline">{formatDate(tag.created_at)}</dd>
            </div>
          </dl>
        </div>
        <TagActions
          id={tag.id}
          name={tag.name}
          slug={tag.slug}
          articleCount={tag.article_count}
        />
      </div>
    </article>
  );
}

export function TagsListView({ data }: { data: AdminTagsListResult }) {
  const { connected, result } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-sans text-2xl font-semibold tracking-tight">
            Etiketler
          </h1>
          <p className="text-sm text-muted-foreground">
            Haber etiketlerini yönetin; kullanılmayanları temizleyin veya
            birleştirin.
            {!connected ? (
              <span className="mt-1 block text-warning">
                Veritabanı bağlantısı yok; liste güvenli boş durumda.
              </span>
            ) : null}
          </p>
        </div>
        <Button size="sm" asChild>
          <Link href="/admin/tags/new">
            <Plus className="size-3.5" aria-hidden />
            Yeni etiket
          </Link>
        </Button>
      </div>

      <TagsFilters data={data} />

      {!connected ? (
        <EmptyState
          icon={Database}
          title="Veritabanı bağlı değil"
          description="Supabase ortam değişkenlerini ayarladıktan sonra etiket listesi burada görünecek."
        />
      ) : result.items.length === 0 ? (
        <EmptyState
          title="Etiket bulunamadı"
          description="Filtrelere uyan etiket yok. Filtreleri temizleyerek tekrar deneyin."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/tags">Filtreleri temizle</Link>
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
                    <TableHead className="min-w-[10rem]">Ad</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Bağlı yayın</TableHead>
                    <TableHead>Oluşturulma</TableHead>
                    <TableHead className="w-12 text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.items.map((tag) => (
                    <TableRow key={tag.id}>
                      <TableCell>
                        <Link
                          href={`/admin/tags/${tag.id}`}
                          className="font-medium hover:underline"
                        >
                          {tag.name}
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {tag.slug}
                      </TableCell>
                      <TableCell className="tabular-nums text-sm">
                        {tag.article_count}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums text-muted-foreground">
                        {formatDate(tag.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <TagActions
                          id={tag.id}
                          name={tag.name}
                          slug={tag.slug}
                          articleCount={tag.article_count}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            {result.items.map((tag) => (
              <TagMobileCard key={tag.id} tag={tag} />
            ))}
          </div>

          <TagsPagination data={data} />
        </>
      )}
    </div>
  );
}
