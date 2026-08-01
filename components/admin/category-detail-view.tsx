import Link from "next/link";
import { Database, ExternalLink } from "lucide-react";

import { CategoryActions } from "@/components/admin/category-actions";
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
import { ARTICLE_STATUS_LABELS } from "@/lib/admin/labels";
import type { AdminCategoryDetailResult } from "@/lib/admin/categories";
import type { DbArticleStatus } from "@/lib/database/types";
import { formatIstanbul } from "@/lib/utils/date";

function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    return formatIstanbul(value, "dd MMM yyyy HH:mm");
  } catch {
    return "—";
  }
}

function isHexColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$/.test(value.trim());
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1 border-b border-border py-3 sm:grid-cols-[11rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm whitespace-pre-wrap">{children}</dd>
    </div>
  );
}

export function CategoryDetailView({
  data,
}: {
  data: AdminCategoryDetailResult;
}) {
  const { connected, category, articleCount, recentArticles } = data;

  if (!connected) {
    return (
      <div className="space-y-6">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">
          Kategori
        </h1>
        <EmptyState
          icon={Database}
          title="Veritabanı bağlı değil"
          description="Supabase ortam değişkenlerini ayarladıktan sonra kategori detayı burada görünecek."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/categories">Listeye dön</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (!category) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-sans text-2xl font-semibold tracking-tight">
              {category.name}
            </h1>
            <Badge variant={category.active ? "success" : "secondary"}>
              {category.active ? "Aktif" : "Pasif"}
            </Badge>
          </div>
          <p className="font-mono text-sm text-muted-foreground">
            {category.slug}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link
              href={`/kategori/${category.slug}`}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink className="size-3.5" aria-hidden />
              Public sayfa
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/categories">Listeye dön</Link>
          </Button>
        </div>
      </div>

      <CategoryActions
        id={category.id}
        name={category.name}
        slug={category.slug}
        active={category.active}
        sortOrder={category.sort_order}
        articleCount={articleCount}
        variant="toolbar"
      />

      <section className="rounded-lg border border-border bg-card/40 px-4">
        <dl>
          <DetailRow label="Ad">{category.name}</DetailRow>
          <DetailRow label="Slug">
            <span className="font-mono">{category.slug}</span>
          </DetailRow>
          <DetailRow label="Açıklama">
            {category.description || "—"}
          </DetailRow>
          <DetailRow label="Renk">
            <span className="inline-flex items-center gap-2">
              <span
                className="size-4 shrink-0 rounded-sm border border-border"
                style={{
                  backgroundColor: isHexColor(category.color)
                    ? category.color
                    : "transparent",
                }}
                aria-hidden
              />
              <span className="font-mono">{category.color}</span>
            </span>
          </DetailRow>
          <DetailRow label="Tema">
            <span className="font-mono">{category.theme}</span>
          </DetailRow>
          <DetailRow label="Sıralama">
            <span className="tabular-nums">{category.sort_order}</span>
          </DetailRow>
          <DetailRow label="Aktiflik">
            {category.active ? "Aktif" : "Pasif"}
          </DetailRow>
          <DetailRow label="Bağlı yayın">
            <span className="tabular-nums">{articleCount}</span>
          </DetailRow>
          <DetailRow label="Oluşturulma">
            {formatDate(category.created_at)}
          </DetailRow>
          <DetailRow label="Güncellenme">
            {formatDate(category.updated_at)}
          </DetailRow>
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="font-sans text-lg font-semibold tracking-tight">
          Bu kategoriye ait son yayınlar
        </h2>
        {recentArticles.length === 0 ? (
          <EmptyState
            title="Henüz yayın yok"
            description="Bu kategoriye bağlı haber bulunmuyor."
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Başlık</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Yayın</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentArticles.map((article) => (
                  <TableRow key={article.id}>
                    <TableCell>
                      <Link
                        href={`/admin/articles/${article.id}`}
                        className="font-medium hover:underline"
                      >
                        {article.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {ARTICLE_STATUS_LABELS[
                          article.status as DbArticleStatus
                        ] ?? article.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm tabular-nums text-muted-foreground">
                      {formatDate(article.published_at ?? article.created_at)}
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
