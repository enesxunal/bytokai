import Link from "next/link";
import { Database, Info } from "lucide-react";

import { AuthorActions } from "@/components/admin/author-actions";
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
import type { AdminAuthorDetailResult } from "@/lib/admin/authors";
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

export function AuthorDetailView({ data }: { data: AdminAuthorDetailResult }) {
  const { connected, author, publishedCount, articleCount, recentArticles } =
    data;

  if (!connected) {
    return (
      <div className="space-y-6">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">
          Yazar profili
        </h1>
        <EmptyState
          icon={Database}
          title="Veritabanı bağlı değil"
          description="Supabase ortam değişkenlerini ayarladıktan sonra profil detayı burada görünecek."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/authors">Listeye dön</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (!author) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-sans text-2xl font-semibold tracking-tight">
              {author.name}
            </h1>
            <Badge variant={author.active ? "success" : "secondary"}>
              {author.active ? "Aktif" : "Pasif"}
            </Badge>
          </div>
          <p className="font-mono text-sm text-muted-foreground">
            {author.slug}
          </p>
          <p className="text-sm text-muted-foreground">{author.role}</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/authors">Listeye dön</Link>
        </Button>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          Public biyografi alanları sitede görünür. Ton, yazım kuralları ve
          system prompt yalnızca admin panelinde tutulur; haber üretimine
          yön verir.
        </p>
      </div>

      <AuthorActions
        id={author.id}
        name={author.name}
        active={author.active}
        articleCount={articleCount}
        variant="toolbar"
      />

      <section className="space-y-3">
        <h2 className="font-sans text-lg font-semibold tracking-tight">
          Public profil
        </h2>
        <div className="rounded-lg border border-border bg-card/40 px-4">
          <dl>
            <DetailRow label="İsim">{author.name}</DetailRow>
            <DetailRow label="Slug">
              <span className="font-mono">{author.slug}</span>
            </DetailRow>
            <DetailRow label="Rol">{author.role}</DetailRow>
            <DetailRow label="Kısa biyografi">
              {author.short_bio || "—"}
            </DetailRow>
            <DetailRow label="Uzun biyografi">
              {author.full_bio || "—"}
            </DetailRow>
            <DetailRow label="Uzmanlık alanları">
              {author.expertise.length > 0
                ? author.expertise.join(", ")
                : "—"}
            </DetailRow>
            <DetailRow label="Avatar seed">
              <span className="font-mono">{author.avatar_seed || "—"}</span>
            </DetailRow>
            <DetailRow label="Aktiflik">
              {author.active ? "Aktif" : "Pasif"}
            </DetailRow>
            <DetailRow label="Yayın sayısı">
              <span className="tabular-nums">{publishedCount}</span>
            </DetailRow>
          </dl>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-sans text-lg font-semibold tracking-tight">
          Editoryal üretim (yalnızca admin)
        </h2>
        <div className="rounded-lg border border-border bg-card/40 px-4">
          <dl>
            <DetailRow label="Ton">{author.tone || "—"}</DetailRow>
            <DetailRow label="Yazım kuralları">
              {author.writing_rules || "—"}
            </DetailRow>
            <DetailRow label="System prompt">
              <div className="rounded-md border border-border bg-background/70 p-3 font-mono text-xs leading-relaxed">
                {author.system_prompt || "—"}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Bu alan yalnızca admin panelinde görünür; public sayfalara
                taşınmaz.
              </p>
            </DetailRow>
            <DetailRow label="Oluşturulma">
              {formatDate(author.created_at)}
            </DetailRow>
            <DetailRow label="Güncellenme">
              {formatDate(author.updated_at)}
            </DetailRow>
          </dl>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-sans text-lg font-semibold tracking-tight">
          Bu yazara ait son yayınlar
        </h2>
        {recentArticles.length === 0 ? (
          <EmptyState
            title="Henüz yayın yok"
            description="Bu profile bağlı haber bulunmuyor."
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
