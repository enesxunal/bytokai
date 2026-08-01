import Image from "next/image";
import Link from "next/link";
import { Newspaper } from "lucide-react";

import { Container } from "@/components/shared/container";
import { EmptyState } from "@/components/shared/empty-state";
import { NewsletterForm } from "@/components/shared/newsletter-form";
import { Badge } from "@/components/ui/badge";
import { authorAvatarUrl } from "@/lib/database/authors";
import type { DbArticleWithRelations, DbAuthor } from "@/lib/database/types";
import {
  loadHomePageData,
  type HomeCategorySection,
} from "@/lib/home/load-home";
import { formatIstanbul } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";

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
  priority = false,
}: {
  article: DbArticleWithRelations;
  className?: string;
  priority?: boolean;
}) {
  if (article.cover_image_url) {
    return (
      <Image
        src={article.cover_image_url}
        alt=""
        fill
        priority={priority}
        className={cn("object-cover", className)}
        sizes="(max-width: 768px) 100vw, 50vw"
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

function FeaturedLead({ article }: { article: DbArticleWithRelations }) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <Link href={`/haber/${article.slug}`} className="block">
        <div className="relative aspect-[16/10] w-full sm:aspect-[21/10]">
          <ArticleCover article={article} priority />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 space-y-3 p-5 sm:p-8">
            <MetaRow article={article} />
            <h2 className="font-serif text-2xl font-semibold tracking-tight text-white sm:text-4xl">
              {article.title}
            </h2>
            {article.excerpt ? (
              <p className="max-w-3xl text-sm leading-relaxed text-white/85 sm:text-base line-clamp-2">
                {article.excerpt}
              </p>
            ) : null}
          </div>
        </div>
      </Link>
    </article>
  );
}

function FeaturedSideCard({ article }: { article: DbArticleWithRelations }) {
  return (
    <article className="group flex gap-4 border-b border-border py-4 last:border-b-0 last:pb-0 first:pt-0">
      <Link
        href={`/haber/${article.slug}`}
        className="relative hidden h-20 w-28 shrink-0 overflow-hidden rounded-lg sm:block"
      >
        <ArticleCover article={article} />
      </Link>
      <div className="min-w-0 flex-1 space-y-2">
        <MetaRow article={article} />
        <h3 className="font-serif text-lg font-semibold leading-snug tracking-tight">
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

function ArticleCard({ article }: { article: DbArticleWithRelations }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
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

function SectionHeading({
  title,
  href,
  description,
}: {
  title: string;
  href?: string;
  description?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {href ? (
        <Link
          href={href}
          className="text-sm font-medium text-primary transition-opacity hover:opacity-80"
        >
          Tümünü gör
        </Link>
      ) : null}
    </div>
  );
}

function CategorySectionBlock({ section }: { section: HomeCategorySection }) {
  const title = section.category?.name ?? sectionTitleFallback(section.slug);
  const description = section.category?.description;
  const href = `/kategori/${section.slug}`;

  return (
    <section id={section.slug} className="scroll-mt-24">
      <SectionHeading title={title} href={href} description={description} />
      {section.articles.length === 0 ? (
        <EmptyState
          title={`${title} bölümünde henüz haber yok`}
          description="Yayınlandığında bu kategorideki içerikler burada listelenir."
          className="py-10"
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {section.articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </section>
  );
}

function sectionTitleFallback(slug: string): string {
  const map: Record<string, string> = {
    "yapay-zeka": "Yapay Zekâ",
    gelistirici: "Geliştirici",
    "is-dunyasi": "İş Dünyası",
    arastirma: "Araştırma",
    yorum: "Yorum",
  };
  return map[slug] ?? slug;
}

function AuthorsSection({ authors }: { authors: DbAuthor[] }) {
  return (
    <section id="yazarlar" className="scroll-mt-24">
      <SectionHeading
        title="Yazarlar"
        description="Editoryal sesler ve uzmanlık alanları"
      />
      {authors.length === 0 ? (
        <EmptyState
          title="Yazar listesi henüz hazır değil"
          description="Aktif yazar profilleri eklendiğinde burada görünecek."
          className="py-10"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {authors.map((author) => (
            <Link
              key={author.id}
              href={`/yazar/${author.slug}`}
              className="flex gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={authorAvatarUrl(author)}
                alt=""
                width={48}
                height={48}
                className="h-12 w-12 rounded-full bg-muted"
              />
              <div className="min-w-0">
                <h3 className="font-serif text-lg font-semibold tracking-tight">
                  {author.name}
                </h3>
                <p className="text-xs font-medium text-primary">{author.role}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {author.short_bio}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function NewsletterSection({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;

  return (
    <section
      id="bulten"
      className="scroll-mt-24 overflow-hidden rounded-2xl border border-border bg-card"
    >
      <div className="relative px-6 py-10 sm:px-10 sm:py-12">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-brand opacity-[0.08]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">
            Haftalık BYTOK bülteni
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Yapay zekâ, geliştirici ekosistemi ve iş dünyasından seçilmiş
            haberleri e-posta kutunuza alın.
          </p>
          <div className="mx-auto mt-6 max-w-md">
            <NewsletterForm id="home-newsletter-email" />
          </div>
        </div>
      </div>
    </section>
  );
}

export default async function HomePage() {
  const data = await loadHomePageData();

  return (
    <main>
      <Container className="space-y-16 py-8 sm:py-12 lg:space-y-20">
        {!data.hasAnyArticles ? (
          <EmptyState
            icon={Newspaper}
            title="Henüz yayınlanmış haber yok"
            description={
              data.dbConfigured
                ? "Veritabanı bağlı. İlk içerikler yayınlandığında öne çıkan haberler ve kategori bölümleri burada görünecek."
                : "Supabase ortam değişkenleri henüz tanımlı değil. Bağlantı kurulup içerik yayınlandığında bu alan otomatik dolar."
            }
          />
        ) : (
          <>
            <section id="one-cikan" aria-labelledby="featured-heading">
              <h1 id="featured-heading" className="sr-only">
                Öne çıkan haberler
              </h1>
              <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-start">
                {data.lead ? <FeaturedLead article={data.lead} /> : null}
                <div className="rounded-2xl border border-border bg-card/60 px-4 sm:px-5">
                  <p className="border-b border-border py-4 font-sans text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Öne çıkanlar
                  </p>
                  {data.featuredSecondary.length > 0 ? (
                    data.featuredSecondary.map((article) => (
                      <FeaturedSideCard key={article.id} article={article} />
                    ))
                  ) : (
                    <p className="py-8 text-sm text-muted-foreground">
                      Ek öne çıkan haber bulunmuyor.
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section id="son-haberler" className="scroll-mt-24">
              <SectionHeading
                title="Son Haberler"
                description="Yeni yayınlanan editoryal içerikler"
              />
              {data.latest.length === 0 ? (
                <EmptyState
                  title="Başka yeni haber yok"
                  description="Öne çıkanların dışında ek son haber bulunmuyor."
                  className="py-10"
                />
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {data.latest.map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {data.sections.map((section) => (
          <CategorySectionBlock key={section.slug} section={section} />
        ))}

        <AuthorsSection authors={data.authors} />
        <NewsletterSection enabled={data.settings.enable_newsletter} />
      </Container>
    </main>
  );
}
