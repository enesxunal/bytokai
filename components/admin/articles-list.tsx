import Link from "next/link";
import { Database, Plus, Star } from "lucide-react";

import { ArticleActions } from "@/components/admin/article-actions";
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
  buildAdminArticlesQueryString,
  type AdminArticlesListResult,
} from "@/lib/admin/articles";
import type { DbArticleStatus } from "@/lib/database/types";
import { formatIstanbul } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

const STATUS_OPTIONS: DbArticleStatus[] = [
  "draft",
  "needs_review",
  "scheduled",
  "published",
  "archived",
  "failed",
];

function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    return formatIstanbul(value, "dd MMM yyyy HH:mm");
  } catch {
    return "—";
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

function ArticlesFilters({ data }: { data: AdminArticlesListResult }) {
  const { filters, options } = data;

  return (
    <form
      method="get"
      action="/admin/articles"
      className="grid gap-3 rounded-lg border border-border bg-card/40 p-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
        <Label htmlFor="q">Arama</Label>
        <Input
          id="q"
          name="q"
          defaultValue={filters.q}
          placeholder="Başlık, spot, slug, kaynak…"
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
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {ARTICLE_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="kategori">Kategori</Label>
        <select
          id="kategori"
          name="kategori"
          defaultValue={filters.categoryId ?? ""}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
        >
          <option value="">Tümü</option>
          {options.categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="yazar">Yazar</Label>
        <select
          id="yazar"
          name="yazar"
          defaultValue={filters.authorId ?? ""}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
        >
          <option value="">Tümü</option>
          {options.authors.map((author) => (
            <option key={author.id} value={author.id}>
              {author.name}
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

      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
        <Button type="submit" size="sm">
          Filtrele
        </Button>
        <Button type="button" variant="outline" size="sm" asChild>
          <Link href="/admin/articles">Temizle</Link>
        </Button>
      </div>
    </form>
  );
}

function AdminPagination({ data }: { data: AdminArticlesListResult }) {
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
            href={`/admin/articles${buildAdminArticlesQueryString(filters, prev)}`}
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
            href={`/admin/articles${buildAdminArticlesQueryString(filters, next)}`}
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

export function ArticlesListView({ data }: { data: AdminArticlesListResult }) {
  const { connected, result } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-sans text-2xl font-semibold tracking-tight">
            Haberler
          </h1>
          <p className="text-sm text-muted-foreground">
            Haberleri filtreleyin, düzenleyin ve yayın durumunu yönetin.
            {!connected ? (
              <span className="mt-1 block text-warning">
                Veritabanı bağlantısı yok; liste güvenli boş durumda.
              </span>
            ) : null}
          </p>
        </div>
        <Button size="sm" asChild>
          <Link href="/admin/articles/new">
            <Plus className="size-3.5" aria-hidden />
            Yeni haber
          </Link>
        </Button>
      </div>

      <ArticlesFilters data={data} />

      {!connected ? (
        <EmptyState
          icon={Database}
          title="Veritabanı bağlı değil"
          description="Supabase ortam değişkenlerini ayarladıktan sonra haber listesi burada görünecek."
        />
      ) : result.items.length === 0 ? (
        <EmptyState
          title="Haber bulunamadı"
          description="Filtrelere uyan haber yok. Filtreleri temizleyerek tekrar deneyin veya yeni haber ekleyin."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/articles">Filtreleri temizle</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/admin/articles/new">Yeni haber</Link>
              </Button>
            </div>
          }
        />
      ) : (
        <>
          <div className="hidden md:block">
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
                    <TableHead>Öne çıkan</TableHead>
                    <TableHead className="w-12 text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.items.map((article) => (
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
                      <TableCell className="text-muted-foreground">
                        {article.category?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {article.author?.name ?? "—"}
                      </TableCell>
                      <TableCell className="max-w-[8rem] truncate text-muted-foreground">
                        {article.source_name ??
                          article.raw_article?.source?.name ??
                          "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDate(article.scheduled_at)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDate(article.published_at)}
                      </TableCell>
                      <TableCell>
                        {article.featured ? (
                          <Star
                            className="size-4 text-warning"
                            aria-label="Öne çıkan"
                          />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <ArticleActions
                          id={article.id}
                          title={article.title}
                          status={article.status}
                          featured={article.featured}
                          scheduledAt={article.scheduled_at}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <ul className="space-y-3 md:hidden">
            {result.items.map((article) => (
              <li
                key={article.id}
                className={cn(
                  "rounded-lg border border-border bg-card/40 p-4",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-2">
                    <Link
                      href={`/admin/articles/${article.id}`}
                      className="line-clamp-2 text-sm font-semibold hover:underline"
                    >
                      {article.title}
                    </Link>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusVariant(article.status)}>
                        {ARTICLE_STATUS_LABELS[article.status]}
                      </Badge>
                      {article.featured ? (
                        <Badge variant="warning">Öne çıkan</Badge>
                      ) : null}
                    </div>
                    <dl className="grid gap-1 text-xs text-muted-foreground">
                      <div>
                        <dt className="inline">Kategori: </dt>
                        <dd className="inline">
                          {article.category?.name ?? "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline">Yazar: </dt>
                        <dd className="inline">
                          {article.author?.name ?? "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline">Kaynak: </dt>
                        <dd className="inline">
                          {article.source_name ??
                            article.raw_article?.source?.name ??
                            "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline">Planlanan: </dt>
                        <dd className="inline">
                          {formatDate(article.scheduled_at)}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline">Yayın: </dt>
                        <dd className="inline">
                          {formatDate(article.published_at)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <ArticleActions
                    id={article.id}
                    title={article.title}
                    status={article.status}
                    featured={article.featured}
                    scheduledAt={article.scheduled_at}
                  />
                </div>
              </li>
            ))}
          </ul>

          <AdminPagination data={data} />
        </>
      )}
    </div>
  );
}
