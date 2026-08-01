import Link from "next/link";
import { BookOpen, Database } from "lucide-react";

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
  BOOK_GENRES,
  BOOK_SUBMISSION_STATUS_LABELS,
  BOOK_SUBMISSION_STATUSES,
} from "@/lib/book-submissions/schema";
import {
  buildAdminBookSubmissionsQueryString,
  type AdminBookSubmissionsListResult,
} from "@/lib/admin/book-submissions";
import { formatIstanbul } from "@/lib/utils/date";

function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    return formatIstanbul(value, "dd MMM yyyy HH:mm");
  } catch {
    return "—";
  }
}

export function BookSubmissionsListView({
  data,
}: {
  data: AdminBookSubmissionsListResult;
}) {
  if (data.kind === "unavailable") {
    return (
      <EmptyState
        icon={Database}
        title="Başvurular yüklenemedi"
        description={data.message}
      />
    );
  }

  const { filters, items, page, totalPages } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-sans text-2xl font-semibold tracking-tight">
          Kitap Başvuruları
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Yayın başvurularını inceleyin ve durumlarını güncelleyin.
        </p>
      </div>

      <form
        method="get"
        action="/admin/book-submissions"
        className="grid gap-3 rounded-lg border border-border bg-card/40 p-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="q">Arama</Label>
          <Input
            id="q"
            name="q"
            defaultValue={filters.q}
            placeholder="Ad, e-posta veya kitap adı…"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="durum">Durum</Label>
          <select
            id="durum"
            name="durum"
            defaultValue={filters.status}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          >
            <option value="">Tümü</option>
            {BOOK_SUBMISSION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {BOOK_SUBMISSION_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tur">Tür</Label>
          <select
            id="tur"
            name="tur"
            defaultValue={filters.genre}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          >
            <option value="">Tümü</option>
            {BOOK_GENRES.map((g) => (
              <option key={g} value={g}>
                {g}
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
            defaultValue={filters.from}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bitis">Bitiş</Label>
          <Input id="bitis" name="bitis" type="date" defaultValue={filters.to} />
        </div>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
          <Button type="submit" size="sm">
            Filtrele
          </Button>
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/admin/book-submissions">Temizle</Link>
          </Button>
        </div>
      </form>

      {items.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Başvuru yok"
          description="Filtrelere uyan başvuru bulunamadı."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kitap</TableHead>
                <TableHead>Başvuran</TableHead>
                <TableHead>Tür</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Tarih</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Link
                      href={`/admin/book-submissions/${item.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {item.book_title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{item.full_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.email}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{item.book_genre}</TableCell>
                  <TableCell className="text-sm">
                    {BOOK_SUBMISSION_STATUS_LABELS[
                      item.status as keyof typeof BOOK_SUBMISSION_STATUS_LABELS
                    ] ?? item.status}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(item.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" size="sm" asChild disabled={page <= 1}>
            <Link
              href={`/admin/book-submissions${buildAdminBookSubmissionsQueryString(filters, page - 1)}`}
            >
              Önceki
            </Link>
          </Button>
          <p className="text-sm text-muted-foreground">
            Sayfa {page} / {totalPages}
          </p>
          <Button
            variant="outline"
            size="sm"
            asChild
            disabled={page >= totalPages}
          >
            <Link
              href={`/admin/book-submissions${buildAdminBookSubmissionsQueryString(filters, page + 1)}`}
            >
              Sonraki
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
