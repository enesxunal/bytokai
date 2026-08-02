import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/shared/container";
import { authorAvatarUrl, getAuthors } from "@/lib/database/authors";
import { getSiteSettings } from "@/lib/database/settings";
import { absoluteUrl } from "@/lib/listing/helpers";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = "Hakkımızda";
  const description =
    "BYTOK AI, yapay zekâ ve teknoloji haberlerine odaklanan Türkçe bir dijital yayındır. Kaynaklı ve özgün editoryal yaklaşımımızı tanıyın.";
  const canonical = absoluteUrl(settings.site_url, "/hakkimizda");

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

export default async function AboutPage() {
  const [settings, authors] = await Promise.all([
    getSiteSettings(),
    getAuthors(),
  ]);

  return (
    <main>
      <Container size="md" className="space-y-12 py-10 sm:py-14">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="transition-colors hover:text-foreground">
                Ana Sayfa
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li className="text-foreground/80" aria-current="page">
              Hakkımızda
            </li>
          </ol>
        </nav>

        <header className="space-y-4 border-b border-border pb-8">
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Kurumsal
          </p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            Hakkımızda
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground text-pretty">
            {settings.site_name}, yapay zekâ ve teknoloji haberlerine odaklanan
            Türkçe bir dijital yayındır. Amacımız; seçilmiş kaynaklardan gelen
            gelişmeleri kaynaklı, anlaşılır ve özgün bir dille okuyucuya
            ulaştırmaktır.
          </p>
        </header>

        <section className="prose-bytok space-y-4">
          <h2>Ne yapıyoruz?</h2>
          <p>
            BYTOK AI; yapay zekâ, geliştirici ekosistemi, iş dünyası, araştırma
            ve eleştirel yorum alanlarında haber yayımlar. Her haberde dayanak
            alınan kaynak gösterilir; metinler Türkçe ve özgün bir anlatımla
            sunulur.
          </p>
          <p>
            Okuyucuya hem güncel gelişmeleri hem de bağlamı birlikte sunmayı
            hedefleriz.
          </p>
        </section>

        <section className="space-y-6">
          <div className="space-y-3">
            <h2 className="font-serif text-2xl font-semibold tracking-tight">
              Yazarlar
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Yayınımızda farklı uzmanlık alanlarına sahip yazarlar yer alır.
              Her yazar kendi üslubu ve odağıyla yazar.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              BYTOK AI yazar profilleri, yayın içindeki farklı editoryal sesleri
              ve uzmanlık alanlarını temsil eder.
            </p>
          </div>

          <ul className="space-y-4">
            {authors.map((author) => (
              <li
                key={author.id}
                className="rounded-xl border border-border bg-card/50 p-5"
              >
                <div className="flex gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={authorAvatarUrl(author)}
                    alt=""
                    width={56}
                    height={56}
                    className="h-14 w-14 shrink-0 rounded-full border border-border/50 bg-muted shadow-sm"
                  />
                  <div className="min-w-0">
                    <h3 className="font-serif text-xl font-semibold tracking-tight">
                      <Link
                        href={`/yazar/${author.slug}`}
                        className="transition-colors hover:text-primary"
                      >
                        {author.name}
                      </Link>
                    </h3>
                    <p className="mt-0.5 text-sm font-medium text-primary">
                      {author.role}
                    </p>
                    {author.short_bio ? (
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {author.short_bio}
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="prose-bytok space-y-4">
          <h2>Şeffaflık</h2>
          <p>
            Kaynak gösterme, özgünleştirme, doğruluk ve düzeltme
            yaklaşımımız için{" "}
            <Link href="/editoryal-politika">editoryal politikamıza</Link>{" "}
            bakabilirsiniz. Takip ettiğimiz kaynaklar{" "}
            <Link href="/kaynaklar">Kaynaklar</Link> sayfasında yer alır.
          </p>
        </section>
      </Container>
    </main>
  );
}
