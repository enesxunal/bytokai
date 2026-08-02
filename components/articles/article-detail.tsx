import Link from "next/link";
import { ExternalLink } from "lucide-react";

import type { ArticlePageData } from "@/lib/articles/load-article-page";
import { authorAvatarUrl } from "@/lib/database/authors";
import type { DbArticleWithRelations } from "@/lib/database/types";
import { ArticleCoverImage } from "@/components/articles/article-cover";
import { Container } from "@/components/shared/container";
import { ShareButtons } from "@/components/shared/share-buttons";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatIstanbul } from "@/lib/utils/date";

function formatDate(value: string | null): string | null {
  if (!value) return null;
  try {
    return formatIstanbul(value, "d MMMM yyyy HH:mm");
  } catch {
    return null;
  }
}

function RelatedCard({ article }: { article: DbArticleWithRelations }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <Link
        href={`/haber/${article.slug}`}
        className="relative aspect-[16/10] overflow-hidden"
      >
        <ArticleCoverImage
          src={article.cover_image_url}
          categorySlug={article.category?.slug}
          alt={article.title}
          sizes="(max-width: 768px) 100vw, 25vw"
          logoSize="sm"
        />
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        {article.category ? (
          <Badge variant="secondary" className="w-fit">
            {article.category.name}
          </Badge>
        ) : null}
        <h3 className="font-serif text-base font-semibold leading-snug tracking-tight">
          <Link
            href={`/haber/${article.slug}`}
            className="transition-colors hover:text-primary"
          >
            {article.title}
          </Link>
        </h3>
      </div>
    </article>
  );
}

type ArticleDetailProps = {
  data: ArticlePageData;
};

function wasMeaningfullyUpdated(
  publishedAt: string | null,
  updatedAt: string | null | undefined,
): boolean {
  if (!publishedAt || !updatedAt) return false;
  const published = Date.parse(publishedAt);
  const updated = Date.parse(updatedAt);
  if (!Number.isFinite(published) || !Number.isFinite(updated)) return false;
  return updated - published > 60_000;
}

export function ArticleDetail({ data }: ArticleDetailProps) {
  const { article, related, bodyHtml, canonicalUrl } = data;
  const publishedLabel = formatDate(article.published_at);
  const updatedLabel = wasMeaningfullyUpdated(
    article.published_at,
    article.updated_at,
  )
    ? formatDate(article.updated_at)
    : null;
  const author = article.author;

  return (
    <article>
      <Container size="md" className="py-8 sm:py-12">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="transition-colors hover:text-foreground">
                Ana Sayfa
              </Link>
            </li>
            <li aria-hidden>/</li>
            {article.category ? (
              <>
                <li>
                  <Link
                    href={`/kategori/${article.category.slug}`}
                    className="transition-colors hover:text-foreground"
                  >
                    {article.category.name}
                  </Link>
                </li>
                <li aria-hidden>/</li>
              </>
            ) : null}
            <li className="truncate text-foreground/80" aria-current="page">
              {article.title}
            </li>
          </ol>
        </nav>

        <header className="space-y-5">
          {article.category ? (
            <Link href={`/kategori/${article.category.slug}`}>
              <Badge variant="secondary" className="font-medium">
                {article.category.name}
              </Badge>
            </Link>
          ) : null}

          <h1 className="font-serif text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
            {article.title}
          </h1>

          {article.excerpt ? (
            <p className="text-lg leading-relaxed text-muted-foreground text-pretty">
              {article.excerpt}
            </p>
          ) : null}

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {author ? (
                <Link
                  href={`/yazar/${author.slug}`}
                  className="font-medium text-foreground transition-colors hover:text-primary"
                >
                  {author.name}
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    · {author.role}
                  </span>
                </Link>
              ) : null}
              {publishedLabel ? (
                <time dateTime={article.published_at ?? undefined}>
                  {publishedLabel}
                </time>
              ) : null}
              {updatedLabel ? (
                <time dateTime={article.updated_at}>
                  Güncellendi: {updatedLabel}
                </time>
              ) : null}
              {article.reading_time_minutes > 0 ? (
                <span>{article.reading_time_minutes} dk okuma</span>
              ) : null}
            </div>
            <ShareButtons url={canonicalUrl} title={article.title} />
          </div>
        </header>

        <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl border border-border bg-card sm:mt-10">
          <ArticleCoverImage
            src={article.cover_image_url}
            categorySlug={article.category?.slug}
            alt={article.title}
            priority
            logoSize="lg"
            imageClassName="object-cover object-bottom"
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>

        {bodyHtml ? (
          <div
            className="prose-bytok mt-10"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        ) : null}

        {article.tags.length > 0 ? (
          <div className="mt-10 flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <Link key={tag.id} href={`/etiket/${tag.slug}`}>
                <Badge
                  variant="outline"
                  className="transition-colors hover:border-primary/40 hover:text-primary"
                >
                  {tag.name}
                </Badge>
              </Link>
            ))}
          </div>
        ) : null}

        {(article.source_name || article.source_url) && (
          <aside className="mt-10 rounded-xl border border-border bg-card/60 p-5">
            <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Kaynak
            </h2>
            <div className="mt-2 space-y-2 text-sm">
              {article.source_name ? (
                <p className="font-medium text-foreground">
                  {article.source_name}
                </p>
              ) : null}
              {article.source_url ? (
                <a
                  href={article.source_url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1.5 text-primary transition-opacity hover:opacity-80"
                >
                  Orijinal kaynağı aç
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              ) : null}
            </div>
          </aside>
        )}

        {author ? (
          <aside className="mt-8 rounded-xl border border-border/70 bg-card p-4 sm:p-5">
            <div className="flex gap-3.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={authorAvatarUrl(author)}
                alt=""
                width={48}
                height={48}
                className="h-12 w-12 shrink-0 rounded-full bg-muted"
              />
              <div className="min-w-0">
                <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground/55">
                  Yazar
                </p>
                <h2 className="mt-1 font-serif text-lg font-semibold tracking-tight">
                  <Link
                    href={`/yazar/${author.slug}`}
                    className="transition-colors hover:text-primary"
                  >
                    {author.name}
                  </Link>
                </h2>
                <p className="text-sm font-medium text-primary">{author.role}</p>
                {author.short_bio ? (
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground/70">
                    {author.short_bio
                      .replace(/\beditoryal personası\b/gi, "yazar")
                      .replace(/\bpersonası\b/gi, "yazar")
                      .replace(/\bpersona\b/gi, "yazar")}
                  </p>
                ) : null}
              </div>
            </div>
          </aside>
        ) : null}

        <Separator className="my-12" />

        <section aria-labelledby="related-heading">
          <h2
            id="related-heading"
            className="mb-6 font-serif text-2xl font-semibold tracking-tight"
          >
            Benzer haberler
          </h2>
          {related.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Şu an gösterilecek benzer haber bulunmuyor.
            </p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {related.map((item) => (
                <RelatedCard key={item.id} article={item} />
              ))}
            </div>
          )}
        </section>
      </Container>
    </article>
  );
}
