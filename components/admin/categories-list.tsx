import Link from "next/link";
import { Database, Plus } from "lucide-react";

import { CategoryActions } from "@/components/admin/category-actions";
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
  buildAdminCategoriesQueryString,
  type AdminCategoryListItem,
  type AdminCategoriesListResult,
} from "@/lib/admin/categories";

function truncate(value: string, max = 90): string {
  const trimmed = value.trim();
  if (!trimmed) return "—";
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

function isHexColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$/.test(value.trim());
}

function ColorSwatch({ color }: { color: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="size-3.5 shrink-0 rounded-sm border border-border"
        style={{
          backgroundColor: isHexColor(color) ? color : "transparent",
        }}
        aria-hidden
      />
      <span className="font-mono text-xs">{color}</span>
    </span>
  );
}

function CategoriesFilters({ data }: { data: AdminCategoriesListResult }) {
  const { filters } = data;
  const aktifDefault =
    filters.active === true ? "evet" : filters.active === false ? "hayir" : "";

  return (
    <form
      method="get"
      action="/admin/categories"
      className="grid gap-3 rounded-lg border border-border bg-card/40 p-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="q">Arama</Label>
        <Input
          id="q"
          name="q"
          defaultValue={filters.q}
          placeholder="Ad, slug, açıklama, tema, renk…"
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

      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
        <Button type="submit" size="sm">
          Filtrele
        </Button>
        <Button type="button" variant="outline" size="sm" asChild>
          <Link href="/admin/categories">Temizle</Link>
        </Button>
      </div>
    </form>
  );
}

function CategoriesPagination({ data }: { data: AdminCategoriesListResult }) {
  const { filters, result } = data;
  if (result.totalPages <= 1) return null;

  const prev = result.page > 1 ? result.page - 1 : null;
  const next = result.page < result.totalPages ? result.page + 1 : null;

  return (
    <nav
      className="flex items-center justify-between gap-4"
      aria-label="Kategori sayfalama"
    >
      {prev ? (
        <Button variant="outline" size="sm" asChild>
          <Link
            href={`/admin/categories${buildAdminCategoriesQueryString(filters, prev)}`}
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
            href={`/admin/categories${buildAdminCategoriesQueryString(filters, next)}`}
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

function CategoryMobileCard({
  category,
}: {
  category: AdminCategoryListItem;
}) {
  return (
    <article className="rounded-lg border border-border bg-card/40 p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/admin/categories/${category.id}`}
              className="font-medium hover:underline"
            >
              {category.name}
            </Link>
            <Badge variant={category.active ? "success" : "secondary"}>
              {category.active ? "Aktif" : "Pasif"}
            </Badge>
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            {category.slug}
          </p>
          <p className="text-sm text-muted-foreground">
            {truncate(category.description, 120)}
          </p>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <div className="col-span-2">
              <dt className="inline">Renk / tema: </dt>
              <dd className="inline">
                <ColorSwatch color={category.color} /> · {category.theme}
              </dd>
            </div>
            <div>
              <dt className="inline">Sıra: </dt>
              <dd className="inline tabular-nums">{category.sort_order}</dd>
            </div>
            <div>
              <dt className="inline">Yayın: </dt>
              <dd className="inline tabular-nums">{category.article_count}</dd>
            </div>
          </dl>
        </div>
        <CategoryActions
          id={category.id}
          name={category.name}
          slug={category.slug}
          active={category.active}
          sortOrder={category.sort_order}
          articleCount={category.article_count}
        />
      </div>
    </article>
  );
}

export function CategoriesListView({
  data,
}: {
  data: AdminCategoriesListResult;
}) {
  const { connected, result } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-sans text-2xl font-semibold tracking-tight">
            Kategoriler
          </h1>
          <p className="text-sm text-muted-foreground">
            Haber kategorilerini yönetin; sıralama, renk/tema ve aktiflik burada
            kontrol edilir.
            {!connected ? (
              <span className="mt-1 block text-warning">
                Veritabanı bağlantısı yok; liste güvenli boş durumda.
              </span>
            ) : null}
          </p>
        </div>
        <Button size="sm" asChild>
          <Link href="/admin/categories/new">
            <Plus className="size-3.5" aria-hidden />
            Yeni kategori
          </Link>
        </Button>
      </div>

      <CategoriesFilters data={data} />

      {!connected ? (
        <EmptyState
          icon={Database}
          title="Veritabanı bağlı değil"
          description="Supabase ortam değişkenlerini ayarladıktan sonra kategori listesi burada görünecek."
        />
      ) : result.items.length === 0 ? (
        <EmptyState
          title="Kategori bulunamadı"
          description="Filtrelere uyan kategori yok. Filtreleri temizleyerek tekrar deneyin."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/categories">Filtreleri temizle</Link>
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
                    <TableHead className="min-w-[12rem]">Açıklama</TableHead>
                    <TableHead>Renk / tema</TableHead>
                    <TableHead>Sıralama</TableHead>
                    <TableHead>Aktiflik</TableHead>
                    <TableHead>Yayın</TableHead>
                    <TableHead className="w-12 text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.items.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        <Link
                          href={`/admin/categories/${category.id}`}
                          className="font-medium hover:underline"
                        >
                          {category.name}
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {category.slug}
                      </TableCell>
                      <TableCell className="max-w-[16rem] text-sm text-muted-foreground">
                        {truncate(category.description, 100)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="space-y-0.5">
                          <ColorSwatch color={category.color} />
                          <p className="font-mono text-xs">{category.theme}</p>
                        </div>
                      </TableCell>
                      <TableCell className="tabular-nums text-sm">
                        {category.sort_order}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={category.active ? "success" : "secondary"}
                        >
                          {category.active ? "Aktif" : "Pasif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums text-sm">
                        {category.article_count}
                      </TableCell>
                      <TableCell className="text-right">
                        <CategoryActions
                          id={category.id}
                          name={category.name}
                          slug={category.slug}
                          active={category.active}
                          sortOrder={category.sort_order}
                          articleCount={category.article_count}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            {result.items.map((category) => (
              <CategoryMobileCard key={category.id} category={category} />
            ))}
          </div>

          <CategoriesPagination data={data} />
        </>
      )}
    </div>
  );
}
