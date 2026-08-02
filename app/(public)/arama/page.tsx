import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";

import { ArticleCard } from "@/components/articles/article-card";
import { Container } from "@/components/shared/container";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchArticles } from "@/lib/database/articles";
import { getSiteSettings } from "@/lib/database/settings";
import {
  LISTING_PAGE_SIZE,
  listingCanonical,
  parsePageParam,
  sanitizeSearchQuery,
} from "@/lib/listing/helpers";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    q?: string | string[];
    sayfa?: string | string[];
  }>;
};

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const sp = await searchParams;
  const q = sanitizeSearchQuery(sp.q);
  const page = parsePageParam(sp.sayfa);
  const settings = await getSiteSettings();

  const title = q
    ? page > 1
      ? `Arama: ${q} · Sayfa ${page}`
      : `Arama: ${q}`
    : "Arama";
  const description = q
    ? `"${q}" için BYTOK AI arama sonuçları.`
    : "BYTOK AI haberlerinde başlık, spot, içerik ve etiketlerde arama yapın.";
  const canonical = listingCanonical(
    settings.site_url,
    "/arama",
    page,
    q ? { q } : undefined,
  );

  return {
    title,
    description,
    alternates: { canonical },
    robots: q ? { index: true, follow: true } : { index: false, follow: true },
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

function SearchForm({ defaultQuery }: { defaultQuery: string }) {
  return (
    <form
      action="/arama"
      method="get"
      role="search"
      className="flex flex-col gap-3 sm:flex-row"
    >
      <label htmlFor="search-q" className="sr-only">
        Arama sorgusu
      </label>
      <Input
        id="search-q"
        name="q"
        type="search"
        defaultValue={defaultQuery}
        placeholder="Haber, spot, içerik veya etiket ara…"
        maxLength={100}
        autoComplete="off"
        className="h-11 flex-1"
      />
      <Button type="submit" className="h-11 shrink-0 sm:px-6">
        Ara
      </Button>
    </form>
  );
}

export default async function SearchPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = sanitizeSearchQuery(sp.q);
  const page = parsePageParam(sp.sayfa);

  const results = q
    ? await searchArticles(q, page, LISTING_PAGE_SIZE)
    : null;

  const basePath = q
    ? `/arama?q=${encodeURIComponent(q)}`
    : "/arama";

  return (
    <main>
      <Container className="space-y-10 py-8 sm:py-12">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
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
              Arama
            </li>
          </ol>
        </nav>

        <header className="space-y-5 border-b border-border pb-6">
          <div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
              Arama
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Başlık, spot, içerik ve etiketlerde arama yapın.
            </p>
          </div>
          <SearchForm defaultQuery={q} />
        </header>

        {!q ? (
          <EmptyState
            icon={Search}
            title="Ne aramak istiyorsunuz?"
            description="Yukarıdaki alana bir anahtar kelime yazıp Ara’ya basın. Örnek: yapay zekâ, LLM, düzenleme."
          />
        ) : results && results.items.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Sonuç bulunamadı"
            description={`“${q}” için eşleşen yayınlanmış haber bulunamadı. Farklı bir kelime deneyin veya ana sayfaya dönün.`}
            action={
              <Button variant="outline" asChild>
                <Link href="/">Ana sayfaya dön</Link>
              </Button>
            }
          />
        ) : results ? (
          <>
            <p className="text-sm text-muted-foreground">
              “{q}” için {results.total} sonuç
              {page > 1 ? ` · Sayfa ${page}` : null}
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {results.items.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
            <Pagination
              page={results.page}
              totalPages={results.totalPages}
              basePath={basePath}
            />
          </>
        ) : null}
      </Container>
    </main>
  );
}
