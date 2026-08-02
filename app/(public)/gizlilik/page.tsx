import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/shared/container";
import { getSiteSettings } from "@/lib/database/settings";
import { absoluteUrl } from "@/lib/listing/helpers";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = "Gizlilik";
  const description =
    "BYTOK AI gizlilik bilgilendirmesi: hangi verilerin işlenebileceği, çerezler ve iletişim tercihleri hakkında sade açıklama.";
  const canonical = absoluteUrl(settings.site_url, "/gizlilik");

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

export default async function PrivacyPage() {
  const settings = await getSiteSettings();

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
              Gizlilik
            </li>
          </ol>
        </nav>

        <header className="space-y-4 border-b border-border pb-8">
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Kurumsal
          </p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            Gizlilik
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground text-pretty">
            Bu metin, {settings.site_name} sitesini kullanırken kişisel
            verilerinizle ilgili genel bilgilendirmedir. Kesin hukuki
            danışmanlık yerine geçmez; yayıncılık kapsamında sade bir
            açıklamadır.
          </p>
        </header>

        <div className="space-y-10 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
              Hangi veriler işlenebilir?
            </h2>
            <p>
              Siteyi ziyaret ettiğinizde teknik olarak IP adresi, tarayıcı
              türü, cihaz bilgisi, ziyaret edilen sayfalar ve benzeri günlük
              kayıtları oluşabilir. Bu veriler güvenlik, performans ve yayın
              kalitesi için kullanılabilir.
            </p>
            <p>
              Bülten veya iletişim formu gibi özellikler açıksa, verdiğiniz
              e-posta adresi ve mesaj içeriği yalnızca ilgili işlemi yürütmek
              için kullanılır.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
              Kitap yayın başvuruları
            </h2>
            <p>
              Kitap yayınlatma formu üzerinden ilettiğiniz ad soyad, e-posta,
              telefon, eser bilgileri, özet, yazar biyografisi ve yüklediğiniz
              dosya; editoryal değerlendirme, dosya inceleme ve sizinle iletişim
              kurmak amacıyla işlenir.
            </p>
            <p>
              Bu veriler pazarlama veya bülten aboneliği için otomatik
              kullanılmaz. Başvuru onayı, bülten aboneliğinden ayrıdır.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
              Çerezler ve benzer teknolojiler
            </h2>
            <p>
              Site; tema tercihi, oturum güvenliği veya temel analitik gibi
              amaçlarla çerez veya benzer depolama teknolojileri kullanabilir.
              Zorunlu teknik çerezler sitenin çalışması için gerekli olabilir.
            </p>
            <p>
              Tarayıcı ayarlarınızdan çerezleri yönetebilirsiniz. Bazı
              çerezleri kapatmak, sitenin bir bölümünün düzgün
              çalışmamasına yol açabilir.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
              Üçüncü taraflar
            </h2>
            <p>
              Barındırma, veritabanı, analitik veya e-posta hizmeti gibi
              altyapı sağlayıcıları, hizmetin sunulması için sınırlı veri
              işleyebilir. Bu sağlayıcılar kendi gizlilik politikalarına da
              tabidir.
            </p>
            <p>
              Haberlere eklenen dış bağlantılar (örneğin kaynak siteler)
              BYTOK AI’ın kontrolünde değildir. Bu sitelerin gizlilik
              uygulamalarından BYTOK AI sorumlu tutulamaz.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
              Saklama ve güvenlik
            </h2>
            <p>
              Veriler, hizmetin gerektirdiği süre boyunca ve makul teknik
              önlemlerle saklanmaya çalışılır. Hiçbir çevrimiçi sistem mutlak
              güvenlik vaat edemez; buna rağmen erişim ve kayıtlar makul
              ölçüde korunur.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
              Haklarınız ve iletişim
            </h2>
            <p>
              Yürürlükteki mevzuat kapsamında erişim, düzeltme veya silme
              gibi talepleriniz olabilir. Taleplerinizi sitede yayımlanan
              iletişim kanalları üzerinden iletebilirsiniz. Kimlik
              doğrulaması gereken durumlarda ek bilgi istenebilir.
            </p>
            <p>
              Bu metin zaman zaman güncellenebilir. Güncel sürüm her zaman bu
              sayfada yayımlanır.
            </p>
          </section>
        </div>
      </Container>
    </main>
  );
}
