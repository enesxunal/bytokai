import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/shared/container";
import { getSiteSettings } from "@/lib/database/settings";
import { absoluteUrl } from "@/lib/listing/helpers";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = "Kullanım koşulları";
  const description =
    "BYTOK AI kullanım koşulları: sitenin kullanımı, içerik hakları, sorumluluk sınırları ve yapay zekâ destekli yayın hakkında bilgilendirme.";
  const canonical = absoluteUrl(settings.site_url, "/kullanim-kosullari");

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

export default async function TermsPage() {
  const settings = await getSiteSettings();

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
              Kullanım koşulları
            </li>
          </ol>
        </nav>

        <header className="space-y-4 border-b border-border pb-8">
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Kurumsal
          </p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            Kullanım koşulları
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground text-pretty">
            {settings.site_name} sitesini kullanarak aşağıdaki genel koşulları
            kabul etmiş sayılırsınız. Bu metin genel yayın bilgilendirmesidir;
            kesin hukuki danışmanlık değildir.
          </p>
        </header>

        <div className="space-y-10 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
              Hizmetin kapsamı
            </h2>
            <p>
              BYTOK AI; yapay zekâ ve teknoloji odaklı haber, analiz ve
              editoryal içerik yayımlayan dijital bir yayındır. İçerikler
              kaynaklı ve yapay zekâ destekli editoryal süreçlerle
              hazırlanabilir.
            </p>
            <p>
              Site bilgilendirme amaçlıdır. Yatırım, hukuki veya teknik
              kararlarınızı yalnızca site içeriğine dayandırmanız önerilmez.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
              İçerik ve fikri haklar
            </h2>
            <p>
              Aksi belirtilmedikçe, sitede yayımlanan özgün metinler, tasarım
              ve marka unsurları BYTOK AI’a aittir veya lisanslıdır. İçeriği
              kişisel ve gayri ticari bilgilendirme dışında izinsiz kopyalamak,
              toplu şekilde yeniden yayımlamak veya ticari ürün olarak
              sunmak yasaktır.
            </p>
            <p>
              Haberlere eklenen kaynak bağlantıları ilgili üçüncü taraf
              sitelere aittir. Kaynak sitelerin içeriği ve kullanımı onların
              kendi koşullarına tabidir.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
              Kabul edilebilir kullanım
            </h2>
            <p>
              Siteyi yasalara uygun, başka kullanıcıları veya altyapıyı
              zarar vermeyecek şekilde kullanmalısınız. Otomatik aşırı istek,
              güvenlik açıklarını deneme, sahte kimlikle işlem veya zararlı
              yazılım yayma gibi davranışlar kabul edilmez.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
              Sorumluluk sınırı
            </h2>
            <p>
              İçerikler “olduğu gibi” sunulur. Olgusal hata, gecikme, kesinti
              veya üçüncü taraf kaynaklardan gelen yanlışlık nedeniyle doğabilecek
              dolaylı zararlardan BYTOK AI sorumlu tutulamaz.
            </p>
            <p>
              Yapay zekâ destekli üretimde kalite kontrolleri uygulanır; yine
              de otomatik sistemler hata üretebilir. Düzeltme yaklaşımımız{" "}
              <Link
                href="/editoryal-politika"
                className="text-primary transition-opacity hover:opacity-80"
              >
                editoryal politikada
              </Link>{" "}
              açıklanmıştır.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
              Değişiklikler
            </h2>
            <p>
              Bu koşullar güncellenebilir. Güncel metin bu sayfada yayımlanır.
              Önemli değişikliklerde makul ölçüde bilgilendirme yapılmaya
              çalışılır.
            </p>
            <p>
              Gizlilik uygulamaları için{" "}
              <Link
                href="/gizlilik"
                className="text-primary transition-opacity hover:opacity-80"
              >
                Gizlilik
              </Link>{" "}
              sayfasına bakın.
            </p>
          </section>
        </div>
      </Container>
    </main>
  );
}
