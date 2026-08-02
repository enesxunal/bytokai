import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Newspaper } from "lucide-react";

import { ArticleCard } from "@/components/articles/article-card";
import { Container } from "@/components/shared/container";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { Badge } from "@/components/ui/badge";
import {
  authorAvatarUrl,
  getAuthorBySlug,
} from "@/lib/database/authors";
import { getArticlesByAuthorSlug } from "@/lib/database/articles";
import { getSiteSettings } from "@/lib/database/settings";
import {
  LISTING_PAGE_SIZE,
  breadcrumbJsonLd,
  jsonLdScript,
  listingCanonical,
  parsePageParam,
} from "@/lib/listing/helpers";

export const revalidate = 60;

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sayfa?: string | string[] }>;
};

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const page = parsePageParam(sp.sayfa);
  const [author, settings] = await Promise.all([
    getAuthorBySlug(slug),
    getSiteSettings(),
  ]);

  if (!author) {
    return {
      title: "Yazar bulunamadı",
      robots: { index: false, follow: false },
    };
  }

  const title =
    page > 1 ? `${author.name} · Sayfa ${page}` : author.name;
  const description =
    author.short_bio?.trim() ||
    `${author.name}, BYTOK AI yazarı.`;
  const canonical = listingCanonical(
    settings.site_url,
    `/yazar/${author.slug}`,
    page,
  );

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "profile",
      locale: "tr_TR",
      url: canonical,
      title,
      description,
      siteName: settings.site_name,
    },
  };
}

export default async function AuthorPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = parsePageParam(sp.sayfa);

  const [author, settings] = await Promise.all([
    getAuthorBySlug(slug),
    getSiteSettings(),
  ]);

  if (!author) {
    notFound();
  }

  const articles = await getArticlesByAuthorSlug(
    author.slug,
    page,
    LISTING_PAGE_SIZE,
  );

  const siteUrl = settings.site_url.replace(/\/$/, "");
  const breadcrumb = breadcrumbJsonLd(siteUrl, [
    { name: "Yazarlar", path: "/#yazarlar" },
    { name: author.name, path: `/yazar/${author.slug}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumb) }}
      />
      <main>
        <Container size="lg" className="space-y-10 overflow-x-hidden py-8 sm:py-12">
          <nav
            aria-label="Breadcrumb"
            className="text-sm text-muted-foreground"
          >
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link
                  href="/"
                  className="transition-colors hover:text-foreground"
                >
                  Ana Sayfa
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li>
                <Link
                  href="/#yazarlar"
                  className="transition-colors hover:text-foreground"
                >
                  Yazarlar
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li className="min-w-0 truncate text-foreground/80" aria-current="page">
                {author.name}
              </li>
            </ol>
          </nav>

          <header className="space-y-8 border-b border-border pb-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={authorAvatarUrl(author)}
                alt=""
                width={128}
                height={128}
                className="h-24 w-24 shrink-0 rounded-full border border-border/60 bg-muted shadow-sm sm:h-32 sm:w-32"
              />
              <div className="min-w-0 flex-1 space-y-4">
                <div className="space-y-2">
                  <h1 className="font-serif text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                    {author.name}
                  </h1>
                  <p className="text-sm font-medium text-primary sm:text-base">
                    {author.role}
                  </p>
                </div>
                {author.short_bio ? (
                  <p className="max-w-2xl text-base leading-relaxed text-muted-foreground text-pretty">
                    {author.short_bio}
                  </p>
                ) : null}
                {author.expertise.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {author.expertise.map((item) => (
                      <Badge key={item} variant="secondary">
                        {item}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            {author.full_bio ? (
              <div className="max-w-3xl space-y-3">
                <h2 className="font-serif text-lg font-semibold tracking-tight sm:text-xl">
                  Hakkında
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground text-pretty sm:text-base">
                  {author.full_bio}
                </p>
              </div>
            ) : null}

            <p className="text-sm tabular-nums text-muted-foreground">
              {articles.total} yayın
              {page > 1 ? ` · Sayfa ${page}` : null}
            </p>
          </header>

          <section className="space-y-6">
            <h2 className="font-serif text-2xl font-semibold tracking-tight">
              Son Yazıları
            </h2>

            {articles.items.length === 0 ? (
              <EmptyState
                icon={Newspaper}
                title="Bu yazara ait haber yok"
                description="Yayınlandığında bu yazara ait içerikler burada listelenir."
              />
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {articles.items.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            )}
          </section>

          <Pagination
            page={articles.page}
            totalPages={articles.totalPages}
            basePath={`/yazar/${author.slug}`}
          />
        </Container>
      </main>
    </>
  );
}
