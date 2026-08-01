import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/shared/container";
import { getAuthors } from "@/lib/database/authors";
import { getSiteSettings } from "@/lib/database/settings";
import { absoluteUrl } from "@/lib/listing/helpers";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = "Hakkımızda";
  const description =
    "BYTOK AI, yapay zekâ haberlerine odaklanan dijital yayın ve yayınevidir. Kaynaklı, özgün ve Türkçe editoryal yaklaşımımızı tanıyın.";
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

const PERSONA_ROLES = [
  {
    role: "Vizyoner / Trend Takipçisi",
    focus: "Yeni ürünler, model duyuruları ve teknoloji dalgalarının büyük resmi.",
  },
  {
    role: "Teknik / Developer",
    focus: "API, SDK, açık kaynak ve geliştirici araçlarını net anlatım.",
  },
  {
    role: "Kurumsal / Stratejist",
    focus: "Yatırım, rekabet ve kurumsal yapay zekâ stratejisi.",
  },
  {
    role: "Akademik / Analist",
    focus: "Araştırma, kanıt kalitesi ve sınırlılıkları öne çıkaran analiz.",
  },
  {
    role: "Eleştirmen / Sektör Yorumcusu",
    focus: "Etik, regülasyon ve toplumsal etkiyi adil dille sorgulama.",
  },
] as const;

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
                Ana sayfa
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
            {settings.site_name}, yapay zekâ haberlerine odaklanan dijital bir
            yayın ve yayınevidir. Amacımız; yabancı ve yerli kaynaklardan gelen
            gelişmeleri Türkçe, kaynaklı ve özgün bir editoryal dilde
            okuyucuya ulaştırmaktır.
          </p>
        </header>

        <section className="prose-bytok space-y-4">
          <h2>Ne yapıyoruz?</h2>
          <p>
            BYTOK AI bir haber ajansı değildir; seçilmiş kaynakları izleyen,
            içeriği Türkçeye ve kendi editoryal sesine dönüştüren otomatik
            destekli bir yayın sistemidir. Her haberde kaynak gösterilir;
            metin doğrudan çeviri yerine yeniden yazılır.
          </p>
          <p>
            Yayın çizgimiz teknoloji, iş dünyası, araştırma ve eleştirel
            yorumu kapsar. Okuyucuya hem hız hem de bağlam sunmayı hedefleriz.
          </p>
        </section>

        <section className="space-y-6">
          <div className="space-y-3">
            <h2 className="font-serif text-2xl font-semibold tracking-tight">
              Beş editoryal persona
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              İçerikler, konuya göre seçilen editoryal kimliklerle üretilir.
              Bu personelar gerçek kişiler değildir; BYTOK AI’ın yazım tonunu
              ve uzmanlık odağını yöneten kurgusal editoryal kimliklerdir.
            </p>
          </div>

          <ul className="space-y-4">
            {PERSONA_ROLES.map((item) => {
              const matched = authors.find((a) => a.role === item.role);
              return (
                <li
                  key={item.role}
                  className="rounded-xl border border-border bg-card/50 p-5"
                >
                  <p className="font-sans text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {item.role}
                  </p>
                  {matched ? (
                    <h3 className="mt-2 font-serif text-xl font-semibold tracking-tight">
                      <Link
                        href={`/yazar/${matched.slug}`}
                        className="transition-colors hover:text-primary"
                      >
                        {matched.name}
                      </Link>
                    </h3>
                  ) : (
                    <h3 className="mt-2 font-serif text-xl font-semibold tracking-tight">
                      Editoryal kimlik
                    </h3>
                  )}
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {matched?.short_bio?.trim() || item.focus}
                  </p>
                </li>
              );
            })}
          </ul>

          <p className="rounded-xl border border-primary/20 bg-accent/40 p-5 text-sm leading-relaxed text-muted-foreground">
            Personaların adları, unvanları ve biyografileri editoryal sistemin
            parçasıdır. Gerçek gazeteci veya yazar kimliği iddiası taşımazlar.
          </p>
        </section>

        <section className="prose-bytok space-y-4">
          <h2>Şeffaflık</h2>
          <p>
            Yapay zekâ destekli üretim, kaynak atıfı, düzeltme ve telif
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
