import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { DbArticleWithRelations } from "@/lib/database/types";
import { formatIstanbul } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

function formatDate(value: string | null): string | null {
  if (!value) return null;
  try {
    return formatIstanbul(value, "d MMMM yyyy");
  } catch {
    return null;
  }
}

function CoverPlaceholder({
  categorySlug,
  className,
}: {
  categorySlug?: string | null;
  className?: string;
}) {
  const coverClass =
    categorySlug === "yapay-zeka" ? "bg-cover-yapay-zeka" : "bg-cover-default";

  return (
    <div
      className={cn(
        "relative flex h-full w-full items-end overflow-hidden p-4",
        coverClass,
        className,
      )}
      aria-hidden
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgb(255_255_255/0.12),transparent_45%)]" />
      <div className="relative h-1 w-16 rounded-full bg-white/70" />
    </div>
  );
}

function ArticleCover({
  article,
  className,
}: {
  article: DbArticleWithRelations;
  className?: string;
}) {
  if (article.cover_image_url) {
    return (
      <Image
        src={article.cover_image_url}
        alt=""
        fill
        className={cn("object-cover", className)}
        sizes="(max-width: 768px) 100vw, 33vw"
      />
    );
  }

  return <CoverPlaceholder categorySlug={article.category?.slug} />;
}

function MetaRow({ article }: { article: DbArticleWithRelations }) {
  const date = formatDate(article.published_at);
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      {article.category ? (
        <Badge variant="secondary" className="font-medium">
          {article.category.name}
        </Badge>
      ) : null}
      {article.author ? <span>{article.author.name}</span> : null}
      {date ? (
        <>
          <span aria-hidden>·</span>
          <time dateTime={article.published_at ?? undefined}>{date}</time>
        </>
      ) : null}
      {article.reading_time_minutes > 0 ? (
        <>
          <span aria-hidden>·</span>
          <span>{article.reading_time_minutes} dk</span>
        </>
      ) : null}
    </div>
  );
}

type ArticleCardProps = {
  article: DbArticleWithRelations;
  className?: string;
};

export function ArticleCard({ article, className }: ArticleCardProps) {
  return (
    <article
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm",
        className,
      )}
    >
      <Link
        href={`/haber/${article.slug}`}
        className="relative aspect-[16/10] overflow-hidden"
      >
        <ArticleCover article={article} />
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <MetaRow article={article} />
        <h3 className="font-serif text-xl font-semibold leading-snug tracking-tight">
          <Link
            href={`/haber/${article.slug}`}
            className="transition-colors hover:text-primary"
          >
            {article.title}
          </Link>
        </h3>
        {article.excerpt ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {article.excerpt}
          </p>
        ) : null}
      </div>
    </article>
  );
}
