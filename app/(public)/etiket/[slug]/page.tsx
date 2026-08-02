import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Newspaper } from "lucide-react";

import { ArticleCard } from "@/components/articles/article-card";
import { Container } from "@/components/shared/container";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { getArticlesByTagSlug } from "@/lib/database/articles";
import { getSiteSettings } from "@/lib/database/settings";
import { getTagBySlug } from "@/lib/database/tags";
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
  const [tag, settings] = await Promise.all([
    getTagBySlug(slug),
    getSiteSettings(),
  ]);

  if (!tag) {
    return {
      title: "Etiket bulunamadı",
      robots: { index: false, follow: false },
    };
  }

  const title = page > 1 ? `${tag.name} · Sayfa ${page}` : tag.name;
  const description = `"${tag.name}" etiketiyle ilişkili BYTOK AI haberleri.`;
  const canonical = listingCanonical(
    settings.site_url,
    `/etiket/${tag.slug}`,
    page,
  );

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      locale: "tr_TR",
      url: canonical,
      title,
      description,
      siteName: settings.site_name,
    },
  };
}

export default async function TagPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = parsePageParam(sp.sayfa);

  const [tag, settings] = await Promise.all([
    getTagBySlug(slug),
    getSiteSettings(),
  ]);

  if (!tag) {
    notFound();
  }

  const articles = await getArticlesByTagSlug(
    tag.slug,
    page,
    LISTING_PAGE_SIZE,
  );

  const siteUrl = settings.site_url.replace(/\/$/, "");
  const breadcrumb = breadcrumbJsonLd(siteUrl, [
    { name: tag.name, path: `/etiket/${tag.slug}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumb) }}
      />
      <main>
        <Container className="space-y-10 py-8 sm:py-12">
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
              <li className="text-foreground/80" aria-current="page">
                #{tag.name}
              </li>
            </ol>
          </nav>

          <header className="space-y-3 border-b border-border pb-6">
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Etiket
            </p>
            <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
              {tag.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {articles.total} haber
              {page > 1 ? ` · Sayfa ${page}` : null}
            </p>
          </header>

          {articles.items.length === 0 ? (
            <EmptyState
              icon={Newspaper}
              title="Bu etikete bağlı haber yok"
              description="Yayınlandığında bu etiketle ilişkilendirilmiş içerikler burada listelenir."
            />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {articles.items.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          )}

          <Pagination
            page={articles.page}
            totalPages={articles.totalPages}
            basePath={`/etiket/${tag.slug}`}
          />
        </Container>
      </main>
    </>
  );
}
