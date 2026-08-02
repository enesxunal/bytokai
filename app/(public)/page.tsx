import Link from "next/link";
import type { Metadata } from "next";
import { Newspaper } from "lucide-react";

import {
  ArticleCoverImage,
} from "@/components/articles/article-cover";
import { Container } from "@/components/shared/container";
import { EmptyState } from "@/components/shared/empty-state";
import { NewsletterForm } from "@/components/shared/newsletter-form";
import { Badge } from "@/components/ui/badge";
import { authorAvatarUrl } from "@/lib/database/authors";
import type { DbArticleWithRelations, DbAuthor } from "@/lib/database/types";
import { getSiteSettings } from "@/lib/database/settings";
import {
  loadHomePageData,
  type HomeCategorySection,
} from "@/lib/home/load-home";
import { absoluteUrl, jsonLdScript } from "@/lib/listing/helpers";
import { formatIstanbul } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

/** Shared public homepage cache window; publish cron revalidates `/`. */
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const canonical = absoluteUrl(settings.site_url, "/");

  return {
    title: {
      absolute: `${settings.site_name} · ${settings.site_tagline}`,
    },
    description: settings.site_description,
    alternates: { canonical },
    openGraph: {
      title: settings.site_name,
      description: settings.site_description,
      url: canonical,
      siteName: settings.site_name,
      locale: "tr_TR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: settings.site_name,
      description: settings.site_description,
    },
  };
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  try {
    return formatIstanbul(value, "d MMM yyyy");
  } catch {
    return null;
  }
}

function ArticleCover({
  article,
  className,
  priority = false,
  sizes = "(max-width: 768px) 100vw, 33vw",
  showLogo = true,
  logoSize = "md",
}: {
  article: DbArticleWithRelations;
  className?: string;
  priority?: boolean;
  sizes?: string;
  showLogo?: boolean;
  logoSize?: "sm" | "md" | "lg";
}) {
  return (
    <ArticleCoverImage
      src={article.cover_image_url}
      categorySlug={article.category?.slug}
      className={className}
      priority={priority}
      sizes={sizes}
      showLogo={showLogo}
      logoSize={logoSize}
    />
  );
}

function MetaRow({
  article,
  light = false,
  compact = false,
}: {
  article: DbArticleWithRelations;
  light?: boolean;
  compact?: boolean;
}) {
  const date = formatDate(article.published_at);
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] leading-snug",
        light ? "text-white/80" : "text-foreground/65",
      )}
    >
      {article.category ? (
        <Badge
          variant="secondary"
          className={cn(
            "font-medium",
            light && "border-white/20 bg-white/15 text-white",
          )}
        >
          {article.category.name}
        </Badge>
      ) : null}
      {article.author ? <span>{article.author.name}</span> : null}
      {date ? (
        <time dateTime={article.published_at ?? undefined}>{date}</time>
      ) : null}
      {!compact && article.reading_time_minutes > 0 ? (
        <>
          <span aria-hidden>·</span>
          <span>{article.reading_time_minutes} dk okuma</span>
        </>
      ) : null}
    </div>
  );
}

function FeaturedLead({ article }: { article: DbArticleWithRelations }) {
  return (
    <article className="group relative h-full min-h-[240px] overflow-hidden rounded-xl border border-border/80 bg-card sm:min-h-[300px] sm:rounded-2xl lg:min-h-0">
      <Link href={`/haber/${article.slug}`} className="absolute inset-0 block">
        <span className="sr-only">{article.title}</span>
        <ArticleCover
          article={article}
          priority
          sizes="(max-width: 1024px) 100vw, 60vw"
          showLogo={false}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/50 to-black/20" />
      </Link>
      <div className="pointer-events-none relative z-10 flex h-full min-h-[240px] flex-col justify-end gap-2 p-4 sm:min-h-[300px] sm:gap-2.5 sm:p-6 lg:min-h-full lg:p-7">
        <MetaRow article={article} light compact />
        <h1 className="max-w-[28ch] font-serif text-[1.375rem] font-semibold leading-snug tracking-tight text-white sm:text-[1.75rem] lg:text-[2rem] xl:text-[2.125rem]">
          <Link
            href={`/haber/${article.slug}`}
            className="pointer-events-auto transition-colors hover:text-white/90"
          >
            {article.title}
          </Link>
        </h1>
        {article.excerpt ? (
          <p className="hidden max-w-2xl text-[0.9375rem] leading-relaxed text-white/80 line-clamp-2 sm:block">
            {article.excerpt}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function FeaturedSideCard({ article }: { article: DbArticleWithRelations }) {
  return (
    <article className="group flex flex-1 gap-3 border-b border-border/80 py-3 last:border-b-0 last:pb-0 first:pt-0 sm:gap-3.5 sm:py-3.5">
      <Link
        href={`/haber/${article.slug}`}
        className="relative aspect-[4/3] w-[4.5rem] shrink-0 overflow-hidden rounded-md sm:w-[5.5rem]"
        aria-hidden
        tabIndex={-1}
      >
        <ArticleCover
          article={article}
          sizes="88px"
          showLogo={false}
        />
      </Link>
      <div className="min-w-0 flex-1 space-y-1 self-center">
        <MetaRow article={article} compact />
        <h2 className="font-serif text-[0.9375rem] font-semibold leading-snug tracking-tight line-clamp-2 sm:text-base">
          <Link
            href={`/haber/${article.slug}`}
            className="transition-colors hover:text-primary"
          >
            {article.title}
          </Link>
        </h2>
      </div>
    </article>
  );
}

function ArticleCard({ article }: { article: DbArticleWithRelations }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card">
      <Link
        href={`/haber/${article.slug}`}
        className="relative aspect-[16/10] overflow-hidden"
        tabIndex={-1}
        aria-hidden
      >
        <ArticleCover
          article={article}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-3.5 sm:gap-2.5 sm:p-5">
        <MetaRow article={article} compact />
        <h3 className="font-serif text-base font-semibold leading-snug tracking-tight line-clamp-2 sm:text-lg">
          <Link
            href={`/haber/${article.slug}`}
            className="transition-colors hover:text-primary"
          >
            {article.title}
          </Link>
        </h3>
        {article.excerpt ? (
          <p className="hidden line-clamp-2 text-[0.9375rem] leading-relaxed text-foreground/70 sm:block">
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
    <div className="mb-4 flex flex-col gap-1.5 border-b border-border/70 pb-3 sm:mb-5 sm:flex-row sm:items-end sm:justify-between sm:pb-3.5">
      <div>
        <h2 className="font-serif text-xl font-semibold tracking-tight sm:text-2xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 text-[0.8125rem] text-foreground/60 sm:mt-1 sm:text-sm">
            {description}
          </p>
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
  const title = section.category?.name ?? section.slug;
  const description = section.category?.description ?? undefined;
  const href = `/kategori/${section.slug}`;

  return (
    <section id={section.slug} className="scroll-mt-24">
      <SectionHeading title={title} href={href} description={description} />
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {section.articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </section>
  );
}

function AuthorsSection({ authors }: { authors: DbAuthor[] }) {
  if (authors.length === 0) return null;

  return (
    <section id="yazarlar" className="scroll-mt-24">
      <SectionHeading
        title="Yazarlar"
        description="Teknoloji gündemini farklı uzmanlık alanlarından değerlendiren BYTOK AI yazarları."
      />
      <div className="flex flex-wrap justify-center gap-4">
        {authors.map((author) => {
          const bio = author.short_bio?.trim() ?? "";
          return (
            <Link
              key={author.id}
              href={`/yazar/${author.slug}`}
              className="flex w-full min-h-[9.5rem] gap-4 rounded-xl border border-border/70 bg-card p-4 transition-colors hover:border-primary/35 sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.75rem)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={authorAvatarUrl(author)}
                alt=""
                width={64}
                height={64}
                className="h-14 w-14 shrink-0 rounded-full border border-border/50 bg-muted shadow-sm sm:h-16 sm:w-16"
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <h3 className="font-serif text-base font-semibold tracking-tight sm:text-lg">
                  {author.name}
                </h3>
                <p className="mt-0.5 text-sm font-medium text-primary">
                  {author.role}
                </p>
                {bio ? (
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-foreground/65">
                    {bio}
                  </p>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function NewsletterSection({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;

  return (
    <section id="bulten" className="scroll-mt-24" aria-labelledby="bulten-heading">
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-[#0b1220] text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(ellipse 80% 70% at 10% 0%, rgba(21,101,239,0.35), transparent 55%), radial-gradient(ellipse 60% 50% at 100% 100%, rgba(29,78,216,0.25), transparent 50%), linear-gradient(135deg, #070b14 0%, #0b1220 45%, #0d1b33 100%)",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.55) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.55) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
          aria-hidden
        />
        <div className="relative grid gap-8 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-10 lg:px-10 lg:py-11">
          <div className="space-y-3">
            <h2
              id="bulten-heading"
              className="font-serif text-xl font-semibold tracking-tight text-white sm:text-2xl lg:text-[1.75rem]"
            >
              Yapay zekâ gündemini kaçırmayın.
            </h2>
            <p className="max-w-xl text-[0.9375rem] leading-relaxed text-white/75 sm:text-base">
              Haftanın önemli yapay zekâ, teknoloji ve iş dünyası gelişmelerini
              kısa ve anlaşılır bir özetle e-posta kutunuza alın.
            </p>
          </div>
          <NewsletterForm id="home-newsletter-email" tone="on-brand" />
        </div>
      </div>
    </section>
  );
}

export default async function HomePage() {
  const data = await loadHomePageData();
  const siteUrl = data.settings.site_url.replace(/\/$/, "");
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: data.settings.site_name,
        url: siteUrl,
        description: data.settings.site_description,
        logo: absoluteUrl(siteUrl, "/icon.png"),
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: data.settings.site_name,
        description: data.settings.site_description,
        publisher: { "@id": `${siteUrl}/#organization` },
        inLanguage: "tr-TR",
        potentialAction: {
          "@type": "SearchAction",
          target: `${siteUrl}/arama?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(structuredData) }}
      />
      <Container className="space-y-8 py-5 sm:space-y-12 sm:py-8 lg:space-y-14 lg:py-10">
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
            <section
              id="one-cikan"
              aria-label="Öne çıkan haberler"
              className="space-y-3 sm:space-y-4"
            >
              <div className="grid gap-4 lg:grid-cols-[1.45fr_1fr] lg:items-stretch lg:gap-6">
                {data.lead ? <FeaturedLead article={data.lead} /> : null}
                <div className="flex flex-col rounded-xl border border-border/70 bg-card/70 px-3.5 sm:rounded-2xl sm:px-5">
                  <p className="border-b border-border/70 py-3 font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-foreground/55 sm:py-3.5 sm:text-xs">
                    Öne çıkanlar
                  </p>
                  <div className="flex flex-1 flex-col justify-between py-0.5 sm:py-1">
                    {data.featuredSecondary.length > 0 ? (
                      data.featuredSecondary.map((article) => (
                        <FeaturedSideCard
                          key={article.id}
                          article={article}
                        />
                      ))
                    ) : (
                      <p className="py-6 text-sm text-foreground/65">
                        Ek öne çıkan haber bulunmuyor.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {data.latest.length > 0 ? (
              <section id="son-haberler" className="scroll-mt-24">
                <SectionHeading
                  title="Son Haberler"
                  description="Yeni yayınlanan editoryal içerikler"
                />
                <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
                  {data.latest.map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>
              </section>
            ) : null}
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
