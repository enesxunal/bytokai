import Link from "next/link";

import { ArticleCoverImage } from "@/components/articles/article-cover";
import { Badge } from "@/components/ui/badge";
import type { DbArticleWithRelations } from "@/lib/database/types";
import { formatIstanbul } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

function formatDate(value: string | null): string | null {
  if (!value) return null;
  try {
    return formatIstanbul(value, "d MMM yyyy");
  } catch {
    return null;
  }
}

function MetaRow({ article }: { article: DbArticleWithRelations }) {
  const date = formatDate(article.published_at);
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-foreground/65">
      {article.category ? (
        <Badge variant="secondary" className="font-medium">
          {article.category.name}
        </Badge>
      ) : null}
      {article.author ? <span>{article.author.name}</span> : null}
      {date ? (
        <time dateTime={article.published_at ?? undefined}>{date}</time>
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
        "group flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card",
        className,
      )}
    >
      <Link
        href={`/haber/${article.slug}`}
        className="relative aspect-[16/10] overflow-hidden"
        tabIndex={-1}
        aria-hidden
      >
        <ArticleCoverImage
          src={article.cover_image_url}
          categorySlug={article.category?.slug}
        />
      </Link>
      <div className="flex flex-1 flex-col gap-2.5 p-4 sm:p-5">
        <MetaRow article={article} />
        <h3 className="font-serif text-lg font-semibold leading-snug tracking-tight line-clamp-2 sm:text-xl">
          <Link
            href={`/haber/${article.slug}`}
            className="transition-colors hover:text-primary"
          >
            {article.title}
          </Link>
        </h3>
        {article.excerpt ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-foreground/70">
            {article.excerpt}
          </p>
        ) : null}
      </div>
    </article>
  );
}
