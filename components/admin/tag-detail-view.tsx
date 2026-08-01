import Link from "next/link";
import { Database, ExternalLink } from "lucide-react";

import { TagActions } from "@/components/admin/tag-actions";
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
import type { AdminTagDetailResult } from "@/lib/admin/tags";
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

export function TagDetailView({ data }: { data: AdminTagDetailResult }) {
  const { connected, tag, articleCount, recentArticles } = data;

  if (!connected) {
    return (
      <div className="space-y-6">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">
          Etiket
        </h1>
        <EmptyState
          icon={Database}
          title="Veritabanı bağlı değil"
          description="Supabase ortam değişkenlerini ayarladıktan sonra etiket detayı burada görünecek."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/tags">Listeye dön</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (!tag) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="font-sans text-2xl font-semibold tracking-tight">
            {tag.name}
          </h1>
          <p className="font-mono text-sm text-muted-foreground">{tag.slug}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link
              href={`/etiket/${tag.slug}`}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink className="size-3.5" aria-hidden />
              Public sayfa
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/tags">Listeye dön</Link>
          </Button>
        </div>
      </div>

      <TagActions
        id={tag.id}
        name={tag.name}
        slug={tag.slug}
        articleCount={articleCount}
        variant="toolbar"
      />

      <section className="rounded-lg border border-border bg-card/40 px-4">
        <dl>
          <DetailRow label="Ad">{tag.name}</DetailRow>
          <DetailRow label="Slug">
            <span className="font-mono">{tag.slug}</span>
          </DetailRow>
          <DetailRow label="Bağlı yayın">
            <span className="tabular-nums">{articleCount}</span>
          </DetailRow>
          <DetailRow label="Oluşturulma">
            {formatDate(tag.created_at)}
          </DetailRow>
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="font-sans text-lg font-semibold tracking-tight">
          Bu etikete bağlı son yayınlar
        </h2>
        {recentArticles.length === 0 ? (
          <EmptyState
            title="Henüz yayın yok"
            description="Bu etikete bağlı haber bulunmuyor."
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
