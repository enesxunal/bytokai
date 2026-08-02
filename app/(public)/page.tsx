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
}: {
  article: DbArticleWithRelations;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <ArticleCoverImage
      src={article.cover_image_url}
      categorySlug={article.category?.slug}
      className={className}
      priority={priority}
      sizes={sizes}
    />
  );
}

function MetaRow({
  article,
  light = false,
}: {
  article: DbArticleWithRelations;
  light?: boolean;
}) {
  const date = formatDate(article.published_at);
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-1 text-xs",
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
      {article.reading_time_minutes > 0 ? (
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
    <article className="group relative h-full min-h-[280px] overflow-hidden rounded-2xl border border-border/80 bg-card sm:min-h-[320px] lg:min-h-0">
      <Link href={`/haber/${article.slug}`} className="absolute inset-0 block">
        <span className="sr-only">{article.title}</span>
        <ArticleCover
          article={article}
          priority
          sizes="(max-width: 1024px) 100vw, 60vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/15" />
      </Link>
      <div className="pointer-events-none relative z-10 flex h-full min-h-[280px] flex-col justify-end space-y-3 p-5 sm:min-h-[320px] sm:p-7 lg:min-h-full lg:p-8">
        <MetaRow article={article} light />
        <h2 className="max-w-[22ch] font-serif text-[34px] font-semibold leading-[1.15] tracking-tight text-white sm:text-[40px] lg:text-[48px] xl:text-[52px]">
          <Link
            href={`/haber/${article.slug}`}
            className="pointer-events-auto transition-colors hover:text-white/90"
          >
            {article.title}
          </Link>
        </h2>
        {article.excerpt ? (
          <p className="max-w-2xl text-sm leading-relaxed text-white/85 line-clamp-3 sm:text-base sm:line-clamp-2">
            {article.excerpt}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function FeaturedSideCard({ article }: { article: DbArticleWithRelations }) {
  return (
    <article className="group flex flex-1 gap-3.5 border-b border-border/80 py-3.5 last:border-b-0 last:pb-0 first:pt-0">
      <Link
        href={`/haber/${article.slug}`}
        className="relative hidden aspect-[4/3] w-[5.5rem] shrink-0 overflow-hidden rounded-md sm:block"
        aria-hidden
        tabIndex={-1}
      >
        <ArticleCover
          article={article}
          sizes="88px"
        />
      </Link>
      <div className="min-w-0 flex-1 space-y-1.5 self-center">
        <MetaRow article={article} />
        <h3 className="font-serif text-base font-semibold leading-snug tracking-tight line-clamp-2 sm:text-[1.05rem]">
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
    <div className="mb-5 flex flex-col gap-2 border-b border-border/70 pb-3.5 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="font-serif text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm text-foreground/65">{description}</p>
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
  const description = section.category?.description ?? undefined;
  const href = `/kategori/${section.slug}`;

  return (
    <section id={section.slug} className="scroll-mt-24">
      <SectionHeading title={title} href={href} description={description} />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {section.articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
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

function publicBio(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/\beditoryal personası\b/gi, "yazar")
    .replace(/\bpersonası\b/gi, "yazar")
    .replace(/\bpersona\b/gi, "yazar")
    .replace(/\bkurgusal bir editoryal ses[^.]*\./gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function AuthorsSection({ authors }: { authors: DbAuthor[] }) {
  if (authors.length === 0) return null;

  return (
    <section id="yazarlar" className="scroll-mt-24">
      <SectionHeading
        title="Yazarlar"
        description="BYTOK AI yayınında farklı uzmanlık alanlarında yazan yazarlar."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {authors.map((author) => {
          const bio = publicBio(author.short_bio);
          return (
          <Link
            key={author.id}
            href={`/yazar/${author.slug}`}
            className="flex gap-3.5 rounded-xl border border-border/70 bg-card p-4 transition-colors hover:border-primary/35"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={authorAvatarUrl(author)}
              alt=""
              width={48}
              height={48}
              className="h-12 w-12 shrink-0 rounded-full bg-muted"
            />
            <div className="min-w-0">
              <h3 className="font-serif text-lg font-semibold tracking-tight">
                {author.name}
              </h3>
              <p className="mt-0.5 text-sm font-medium text-primary">
                {author.role}
              </p>
              {bio ? (
                <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-foreground/65">
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
              className="font-serif text-2xl font-semibold tracking-tight text-white sm:text-[1.75rem] lg:text-[2rem]"
            >
              Yapay zekâ gündemini kaçırmayın.
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-white/75 sm:text-base">
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
      <Container className="space-y-12 py-7 sm:space-y-14 sm:py-10 lg:space-y-16">
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
              aria-labelledby="featured-heading"
              className="space-y-4"
            >
              <div className="max-w-2xl space-y-2">
                <h1
                  id="featured-heading"
                  className="font-serif text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
                >
                  BYTOK AI
                </h1>
                <p className="text-sm leading-relaxed text-foreground/70 sm:text-[0.95rem]">
                  Yapay zekâ, teknoloji ve dijital dünyanın öne çıkan
                  gelişmeleri.
                  <br className="hidden sm:block" /> Türkçe, kaynaklı ve
                  bağlamı güçlü haberler.
                </p>
              </div>

              <div className="grid gap-5 lg:grid-cols-[1.45fr_1fr] lg:items-stretch lg:gap-6">
                {data.lead ? <FeaturedLead article={data.lead} /> : null}
                <div className="flex flex-col rounded-2xl border border-border/70 bg-card/70 px-4 sm:px-5">
                  <p className="border-b border-border/70 py-3.5 font-sans text-xs font-semibold uppercase tracking-[0.14em] text-foreground/55">
                    Öne çıkanlar
                  </p>
                  <div className="flex flex-1 flex-col justify-between py-1">
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
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
