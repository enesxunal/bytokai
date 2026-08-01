import Link from "next/link";
import { Database, Plus } from "lucide-react";

import { AuthorActions } from "@/components/admin/author-actions";
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
  buildAdminAuthorsQueryString,
  type AdminAuthorListItem,
  type AdminAuthorsListResult,
} from "@/lib/admin/authors";

function truncate(value: string, max = 90): string {
  const trimmed = value.trim();
  if (!trimmed) return "—";
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

function expertiseLabel(expertise: string[]): string {
  if (!expertise.length) return "—";
  return truncate(expertise.join(", "), 60);
}

function AuthorsFilters({ data }: { data: AdminAuthorsListResult }) {
  const { filters, options } = data;
  const aktifDefault =
    filters.active === true ? "evet" : filters.active === false ? "hayir" : "";

  return (
    <form
      method="get"
      action="/admin/authors"
      className="grid gap-3 rounded-lg border border-border bg-card/40 p-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="q">Arama</Label>
        <Input
          id="q"
          name="q"
          defaultValue={filters.q}
          placeholder="İsim, slug, rol, biyografi, ton…"
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
        <Label htmlFor="rol">Rol</Label>
        <select
          id="rol"
          name="rol"
          defaultValue={filters.role ?? ""}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
        >
          <option value="">Tümü</option>
          {options.roles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
        <Button type="submit" size="sm">
          Filtrele
        </Button>
        <Button type="button" variant="outline" size="sm" asChild>
          <Link href="/admin/authors">Temizle</Link>
        </Button>
      </div>
    </form>
  );
}

function AuthorsPagination({ data }: { data: AdminAuthorsListResult }) {
  const { filters, result } = data;
  if (result.totalPages <= 1) return null;

  const prev = result.page > 1 ? result.page - 1 : null;
  const next = result.page < result.totalPages ? result.page + 1 : null;

  return (
    <nav
      className="flex items-center justify-between gap-4"
      aria-label="Yazar sayfalama"
    >
      {prev ? (
        <Button variant="outline" size="sm" asChild>
          <Link
            href={`/admin/authors${buildAdminAuthorsQueryString(filters, prev)}`}
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
            href={`/admin/authors${buildAdminAuthorsQueryString(filters, next)}`}
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

function AuthorMobileCard({ author }: { author: AdminAuthorListItem }) {
  return (
    <article className="rounded-lg border border-border bg-card/40 p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/admin/authors/${author.id}`}
              className="font-medium hover:underline"
            >
              {author.name}
            </Link>
            <Badge variant={author.active ? "success" : "secondary"}>
              {author.active ? "Aktif" : "Pasif"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{author.role}</p>
          <p className="text-sm text-muted-foreground">
            {truncate(author.short_bio, 120)}
          </p>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <div className="col-span-2">
              <dt className="inline">Uzmanlık: </dt>
              <dd className="inline">{expertiseLabel(author.expertise)}</dd>
            </div>
            <div className="col-span-2">
              <dt className="inline">Ton: </dt>
              <dd className="inline">{truncate(author.tone, 70)}</dd>
            </div>
            <div>
              <dt className="inline">Yayın: </dt>
              <dd className="inline tabular-nums">{author.published_count}</dd>
            </div>
          </dl>
        </div>
        <AuthorActions
          id={author.id}
          name={author.name}
          active={author.active}
        />
      </div>
    </article>
  );
}

export function AuthorsListView({ data }: { data: AdminAuthorsListResult }) {
  const { connected, result } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-sans text-2xl font-semibold tracking-tight">
            Yazar Personaları
          </h1>
          <p className="text-sm text-muted-foreground">
            BYTOK AI editoryal personlarını yönetin. Bunlar gerçek kişiler değil;
            haber üretimi için kurgusal seslerdir.
            {!connected ? (
              <span className="mt-1 block text-warning">
                Veritabanı bağlantısı yok; liste güvenli boş durumda.
              </span>
            ) : null}
          </p>
        </div>
        <Button size="sm" asChild>
          <Link href="/admin/authors/new">
            <Plus className="size-3.5" aria-hidden />
            Yeni persona
          </Link>
        </Button>
      </div>

      <AuthorsFilters data={data} />

      {!connected ? (
        <EmptyState
          icon={Database}
          title="Veritabanı bağlı değil"
          description="Supabase ortam değişkenlerini ayarladıktan sonra yazar personası listesi burada görünecek."
        />
      ) : result.items.length === 0 ? (
        <EmptyState
          title="Persona bulunamadı"
          description="Filtrelere uyan yazar personası yok. Filtreleri temizleyerek tekrar deneyin."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/authors">Filtreleri temizle</Link>
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
                    <TableHead className="min-w-[10rem]">İsim</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead className="min-w-[12rem]">Kısa biyografi</TableHead>
                    <TableHead>Uzmanlık</TableHead>
                    <TableHead>Ton</TableHead>
                    <TableHead>Aktiflik</TableHead>
                    <TableHead>Yayın</TableHead>
                    <TableHead className="w-12 text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.items.map((author) => (
                    <TableRow key={author.id}>
                      <TableCell>
                        <Link
                          href={`/admin/authors/${author.id}`}
                          className="font-medium hover:underline"
                        >
                          {author.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {author.role}
                      </TableCell>
                      <TableCell className="max-w-[16rem] text-sm text-muted-foreground">
                        {truncate(author.short_bio, 100)}
                      </TableCell>
                      <TableCell className="max-w-[12rem] text-sm text-muted-foreground">
                        {expertiseLabel(author.expertise)}
                      </TableCell>
                      <TableCell className="max-w-[10rem] text-sm text-muted-foreground">
                        {truncate(author.tone, 50)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={author.active ? "success" : "secondary"}>
                          {author.active ? "Aktif" : "Pasif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums text-sm">
                        {author.published_count}
                      </TableCell>
                      <TableCell className="text-right">
                        <AuthorActions
                          id={author.id}
                          name={author.name}
                          active={author.active}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            {result.items.map((author) => (
              <AuthorMobileCard key={author.id} author={author} />
            ))}
          </div>

          <AuthorsPagination data={data} />
        </>
      )}
    </div>
  );
}
