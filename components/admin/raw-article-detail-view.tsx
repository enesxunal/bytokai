import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { RawArticleActions } from "@/components/admin/raw-article-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RAW_STATUS_LABELS } from "@/lib/admin/labels";
import {
  sanitizePayloadForDisplay,
  truncateText,
  type AdminRawArticleDetail,
} from "@/lib/admin/raw-articles";
import { formatIstanbul } from "@/lib/utils/date";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return formatIstanbul(value, "dd MMM yyyy HH:mm");
  } catch {
    return "—";
  }
}

function MetaRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-[11rem_1fr] sm:gap-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm break-words">{children}</dd>
    </div>
  );
}

function ExternalUrl({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="inline-flex items-center gap-1 text-primary hover:underline"
    >
      <span className="break-all">{href}</span>
      <ExternalLink className="size-3.5 shrink-0" aria-hidden />
    </a>
  );
}

export function RawArticleDetailView({
  article,
}: {
  article: AdminRawArticleDetail;
}) {
  const content = truncateText(article.raw_content, 4000);
  const payloadJson = JSON.stringify(
    sanitizePayloadForDisplay(article.raw_payload),
    null,
    2,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Badge variant="secondary">
            {RAW_STATUS_LABELS[article.status]}
          </Badge>
          <h1 className="font-sans text-2xl font-semibold tracking-tight">
            {article.original_title || "(Başlıksız ham haber)"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {article.source?.name ?? "Kaynak yok"}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/raw-articles">Listeye dön</Link>
        </Button>
      </div>

      <RawArticleActions
        id={article.id}
        title={article.original_title || "Ham haber"}
        status={article.status}
        originalUrl={article.original_url}
        linkedArticleId={article.linked_article?.id ?? null}
        variant="toolbar"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="font-sans text-base font-semibold">
              Kaynak bilgileri
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-2">
            <dl className="space-y-3">
              <MetaRow label="Kaynak">
                {article.source?.name ?? "—"}
              </MetaRow>
              <MetaRow label="Orijinal URL">
                <ExternalUrl href={article.original_url} />
              </MetaRow>
              <MetaRow label="Canonical URL">
                <ExternalUrl href={article.canonical_url} />
              </MetaRow>
              <MetaRow label="Orijinal yazar">
                {article.original_author ?? "—"}
              </MetaRow>
              <MetaRow label="Orijinal yayın">
                {formatDate(article.original_published_at)}
              </MetaRow>
              <MetaRow label="Bulunma">
                {formatDate(article.discovered_at)}
              </MetaRow>
              <MetaRow label="Görsel">
                {article.original_image_url ? (
                  <div className="space-y-2">
                    <div className="relative aspect-[16/9] max-w-sm overflow-hidden rounded-md border border-border">
                      <Image
                        src={article.original_image_url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="384px"
                        unoptimized
                      />
                    </div>
                    <ExternalUrl href={article.original_image_url} />
                  </div>
                ) : (
                  "—"
                )}
              </MetaRow>
            </dl>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="font-sans text-base font-semibold">
              Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-2">
            <dl className="space-y-3">
              <MetaRow label="Durum">
                {RAW_STATUS_LABELS[article.status]}
              </MetaRow>
              <MetaRow label="Deneme sayısı">
                {article.failure_count.toLocaleString("tr-TR")}
              </MetaRow>
              <MetaRow label="Son hata">
                {article.last_error ?? "—"}
              </MetaRow>
              <MetaRow label="İşlenme">
                {formatDate(article.processed_at)}
              </MetaRow>
              <MetaRow label="Oluşturulma">
                {formatDate(article.created_at)}
              </MetaRow>
              <MetaRow label="Güncellenme">
                {formatDate(article.updated_at)}
              </MetaRow>
              <MetaRow label="İlgili haber">
                {article.linked_article ? (
                  <Link
                    href={`/admin/articles/${article.linked_article.id}`}
                    className="text-primary hover:underline"
                  >
                    {article.linked_article.title}
                  </Link>
                ) : (
                  "—"
                )}
              </MetaRow>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="font-sans text-base font-semibold">
            Ham özet
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {article.original_excerpt || "—"}
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="font-sans text-base font-semibold">
            Ham içerik önizlemesi
          </CardTitle>
          <CardDescription>
            {content.truncated
              ? "Uzun içerik kısaltılarak gösteriliyor."
              : "Güvenli metin önizlemesi"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {content.text ? (
            <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3 font-mono text-xs leading-relaxed">
              {content.text}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground">İçerik yok</p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="font-sans text-base font-semibold">
            raw_payload
          </CardTitle>
          <CardDescription>
            Hassas alanlar maskelenmiş güvenli JSON görünümü
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <pre className="max-h-[28rem] overflow-auto rounded-md border border-border bg-muted/30 p-3 font-mono text-xs leading-relaxed">
            {payloadJson}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
