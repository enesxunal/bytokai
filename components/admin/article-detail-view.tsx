import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { ArticleActions } from "@/components/admin/article-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ARTICLE_STATUS_LABELS, RAW_STATUS_LABELS } from "@/lib/admin/labels";
import {
  formatRiskFlags,
  type AdminArticleWithRelations,
} from "@/lib/admin/articles";
import { formatIstanbul } from "@/lib/utils/date";
import { resolveArticleBodyHtml } from "@/lib/utils/markdown";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return formatIstanbul(value, "dd MMM yyyy HH:mm");
  } catch {
    return "—";
  }
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[10rem_1fr] sm:gap-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm break-words">{children}</dd>
    </div>
  );
}

export function ArticleDetailView({
  article,
}: {
  article: AdminArticleWithRelations;
}) {
  const riskFlags = formatRiskFlags(article.risk_flags);
  const bodyHtml = resolveArticleBodyHtml({
    content_html: article.content_html,
    content_markdown: article.content_markdown,
  });
  const confidence =
    article.ai_confidence_score === null || article.ai_confidence_score === undefined
      ? null
      : Math.round(Number(article.ai_confidence_score) * 1000) / 10;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {ARTICLE_STATUS_LABELS[article.status]}
            </Badge>
            {article.featured ? <Badge variant="warning">Öne çıkan</Badge> : null}
            {article.breaking ? <Badge variant="destructive">Son dakika</Badge> : null}
          </div>
          <h1 className="font-sans text-2xl font-semibold tracking-tight">
            {article.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono text-xs">{article.slug}</span>
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/articles">Listeye dön</Link>
        </Button>
      </div>

      <ArticleActions
        id={article.id}
        title={article.title}
        status={article.status}
        featured={article.featured}
        scheduledAt={article.scheduled_at}
        variant="toolbar"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="font-sans text-base font-semibold">
              Yayın bilgileri
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-2">
            <dl className="space-y-3">
              <MetaRow label="Durum">
                {ARTICLE_STATUS_LABELS[article.status]}
              </MetaRow>
              <MetaRow label="Kategori">
                {article.category?.name ?? "—"}
              </MetaRow>
              <MetaRow label="Yazar">{article.author?.name ?? "—"}</MetaRow>
              <MetaRow label="Kaynak">{article.source_name ?? "—"}</MetaRow>
              <MetaRow label="Kaynak URL">
                {article.source_url ? (
                  <a
                    href={article.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    {article.source_url}
                    <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                  </a>
                ) : (
                  "—"
                )}
              </MetaRow>
              <MetaRow label="Planlanan tarih">
                {formatDate(article.scheduled_at)}
              </MetaRow>
              <MetaRow label="Yayın tarihi">
                {formatDate(article.published_at)}
              </MetaRow>
              <MetaRow label="Oluşturulma">
                {formatDate(article.created_at)}
              </MetaRow>
              <MetaRow label="Güncellenme">
                {formatDate(article.updated_at)}
              </MetaRow>
            </dl>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="font-sans text-base font-semibold">
              AI ve SEO
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-2">
            <dl className="space-y-3">
              <MetaRow label="AI güven skoru">
                {confidence === null ? "—" : `%${confidence.toLocaleString("tr-TR")}`}
              </MetaRow>
              <MetaRow label="Risk bayrakları">
                {riskFlags.length === 0 ? (
                  "—"
                ) : (
                  <ul className="flex flex-wrap gap-1.5">
                    {riskFlags.map((flag) => (
                      <li key={flag}>
                        <Badge variant="outline">{flag}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </MetaRow>
              <MetaRow label="SEO başlığı">
                {article.seo_title ?? "—"}
              </MetaRow>
              <MetaRow label="SEO açıklaması">
                {article.seo_description ?? "—"}
              </MetaRow>
              <MetaRow label="Okuma süresi">
                {article.reading_time_minutes} dk
              </MetaRow>
              <MetaRow label="Etiketler">
                {article.tags.length === 0
                  ? "—"
                  : article.tags.map((tag) => tag.name).join(", ")}
              </MetaRow>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="font-sans text-base font-semibold">
            Spot
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {article.excerpt || "—"}
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="font-sans text-base font-semibold">
            Gövde önizlemesi
          </CardTitle>
          <CardDescription>Güvenli HTML önizleme</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {bodyHtml ? (
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">İçerik yok</p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="font-sans text-base font-semibold">
            İlgili ham haber
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          {!article.raw_article ? (
            <p className="text-sm text-muted-foreground">
              Bağlı ham haber kaydı yok.
            </p>
          ) : (
            <dl className="space-y-3">
              <MetaRow label="Orijinal başlık">
                {article.raw_article.original_title}
              </MetaRow>
              <MetaRow label="Kaynak">
                {article.raw_article.source?.name ?? "—"}
              </MetaRow>
              <MetaRow label="Durum">
                {RAW_STATUS_LABELS[article.raw_article.status] ??
                  article.raw_article.status}
              </MetaRow>
              <MetaRow label="Keşif">
                {formatDate(article.raw_article.discovered_at)}
              </MetaRow>
              <MetaRow label="Orijinal URL">
                <a
                  href={article.raw_article.original_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  {article.raw_article.original_url}
                  <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                </a>
              </MetaRow>
              <Separator />
              <MetaRow label="Özet">
                {article.raw_article.original_excerpt ?? "—"}
              </MetaRow>
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
