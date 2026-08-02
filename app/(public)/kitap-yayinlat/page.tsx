import type { Metadata } from "next";
import Link from "next/link";

import { BookSubmissionForm } from "@/components/book-submissions/book-submission-form";
import { Container } from "@/components/shared/container";
import { getSiteSettings } from "@/lib/database/settings";
import { absoluteUrl } from "@/lib/listing/helpers";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = "Kitap Yayınlatma Başvurusu";
  const description =
    "BYTOK AI yayınevi için kitap yayın başvurusu formu. Dosyanızı ve projenizi iletin.";
  const canonical = absoluteUrl(settings.site_url, "/kitap-yayinlat");

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

export default function BookPublishingPage() {
  return (
    <main>
      <Container size="md" className="space-y-10 py-8 sm:py-12">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="transition-colors hover:text-foreground">
                Ana Sayfa
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li className="text-foreground/80" aria-current="page">
              Kitap yayınlat
            </li>
          </ol>
        </nav>

        <header className="space-y-3 border-b border-border pb-8">
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Yayınevi
          </p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            Kitap yayınlatma başvurusu
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Dosyanızı ve yayın projenizi paylaşın. Editoryal ekibimiz
            başvurunuzu inceleyerek sizinle e-posta üzerinden iletişime geçer.
          </p>
        </header>

        <BookSubmissionForm />
      </Container>
    </main>
  );
}
