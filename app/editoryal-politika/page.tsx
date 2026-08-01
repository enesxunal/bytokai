import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/shared/container";
import { getSiteSettings } from "@/lib/database/settings";
import { absoluteUrl } from "@/lib/listing/helpers";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = "Editoryal politika";
  const description =
    "BYTOK AI’ın kaynak gösterme, yapay zekâ destekli üretim, özgünleştirme, doğruluk, düzeltme ve telif politikası.";
  const canonical = absoluteUrl(settings.site_url, "/editoryal-politika");

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

const SECTIONS = [
  {
    id: "kaynak-gosterme",
    title: "Kaynak gösterme",
    body: [
      "Her haberde dayanak alınan kaynağın adı ve mümkün olduğunda orijinal bağlantısı gösterilir. Okuyucu, temel olay veya duyurunun nereden geldiğini haberde görebilir.",
      "Kaynak listemiz Kamuya açık olarak Kaynaklar sayfasında yer alır. Takip edilen bölüm bağlantıları da bu sayfada paylaşılır.",
    ],
  },
  {
    id: "yapay-zeka",
    title: "Yapay zekâ destekli üretim",
    body: [
      "BYTOK AI içerikleri, editoryal kurallar ve persona sistemleriyle yönetilen yapay zekâ destekli bir üretim hattıyla hazırlanır. Bu, haberin insan editoryal çerçevesi olmadan rastgele üretildiği anlamına gelmez; üretim süreci tanımlı kalite ve risk kontrollerine bağlıdır.",
      "Yayınlanan içeriklerde yapay zekâ destekli üretim açıkça belirtilir. Bu açıklama, okuyucunun içeriğin nasıl hazırlandığını bilmesi içindir.",
    ],
  },
  {
    id: "ozgunlestirme",
    title: "Özgünleştirme",
    body: [
      "Kaynak metinler doğrudan çevrilmez veya yakın kopya olarak yayınlanmaz. Temel gerçekler korunur; anlatım, başlık ve yapı BYTOK AI editoryal dilinde yeniden kurulur.",
      "Amaç, kaynak haberi Türkçe okuyucu için anlaşılır ve özgün bir yayına dönüştürmek; kaynak içeriğin telifli ifadesini aynen aktarmamaktır.",
    ],
  },
  {
    id: "dogruluk",
    title: "Doğruluk kontrolü",
    body: [
      "Üretim hattı; kaynak gerçeklerine bağlılık, abartılı iddia, uydurma detay ve düşük güven sinyallerini kontrol etmeye çalışır. Kaynakta olmayan sayı, tarih, alıntı veya teknik iddia üretilmemesi hedeflenir.",
      "Kontroller otomatik ve kural tabanlıdır. Yine de hata olasılığı vardır; bu nedenle düzeltme politikamız aktiftir.",
    ],
  },
  {
    id: "duzeltme",
    title: "Düzeltme politikası",
    body: [
      "Yayın sonrası fark edilen olgusal hatalar, mümkün olan en kısa sürede düzeltilir. Anlamı değiştiren düzeltmelerde içerik güncellenir; gerekirse editoryal not eklenir.",
      "Düzeltme talepleri için sitede yayımlanan iletişim kanallarını veya yönetici süreçlerini kullanabilirsiniz. Talepler incelenir; her talep otomatik kabul edilmez.",
    ],
  },
  {
    id: "telif",
    title: "Telif yaklaşımı",
    body: [
      "BYTOK AI, kaynakların telifli metinlerini kopyalamayı amaçlamaz. Kaynaklar olay, duyuru ve olgu düzeyinde referans alınır; ifade yeniden üretilir ve kaynak atıfı yapılır.",
      "Kapak görselleri ve üçüncü taraf medya için mümkün olduğunca lisanslı veya serbest kullanım koşullarına uygun malzemeler tercih edilir. Hak sahiplerinin talepleri incelenir.",
      "Bu metin genel yayın politikasıdır; hukuki danışmanlık veya kesin hukuki yorum yerine geçmez.",
    ],
  },
  {
    id: "dusuk-guven",
    title: "Düşük güvenli içeriğin otomatik yayınlanmaması",
    body: [
      "Güven skoru düşük, risk bayrağı yüksek veya kalite kontrolünden geçemeyen içerikler otomatik olarak yayınlanmaz. Bu tür içerikler taslak, inceleme veya reddedilmiş durumda tutulabilir.",
      "Otomatik yayın, yalnızca tanımlı eşikleri geçen içerikler için geçerlidir. Belirsiz, çelişkili veya yüksek riskli konular insan incelemesine bırakılabilir.",
    ],
  },
  {
    id: "otomasyon",
    title: "Otomasyonun kapsamı",
    body: [
      "Otomasyon; kaynak tarama, aday haber seçimi, sınıflandırma, persona atama, metin üretimi, kalite kontrolü ve zamanlanmış yayın adımlarını kapsayabilir.",
      "Otomasyon şunları kapsamaz: kaynağın yerine geçmek, doğrulanmamış iddiayı kesin gerçek gibi sunmak, okuyucuyu yanıltacak şekilde insan yazar kimliği iddiası oluşturmak.",
      "Sistem ayarları, eşikler ve kaynak listesi zaman içinde güncellenebilir. Güncel kaynaklar için Kaynaklar sayfasına bakın.",
    ],
  },
] as const;

export default async function EditorialPolicyPage() {
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
              Editoryal politika
            </li>
          </ol>
        </nav>

        <header className="space-y-4 border-b border-border pb-8">
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Kurumsal
          </p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            Editoryal politika
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground text-pretty">
            Bu sayfa, BYTOK AI’ın haber üretimi ve yayınında izlediği genel
            ilkeleri açıklar. Metin kesin hukuki danışmanlık değildir; okuyucu
            ve kaynak sahipleri için şeffaflık amacıyla yazılmıştır.
          </p>
        </header>

        <div className="space-y-10">
          {SECTIONS.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="font-serif text-2xl font-semibold tracking-tight">
                {section.title}
              </h2>
              <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                {section.body.map((paragraph) => (
                  <p key={paragraph.slice(0, 48)}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="rounded-xl border border-border bg-card/50 p-5 text-sm leading-relaxed text-muted-foreground">
          İlgili sayfalar:{" "}
          <Link href="/hakkimizda" className="text-primary hover:opacity-80">
            Hakkımızda
          </Link>
          {" · "}
          <Link href="/kaynaklar" className="text-primary hover:opacity-80">
            Kaynaklar
          </Link>
          {" · "}
          <Link
            href="/kullanim-kosullari"
            className="text-primary hover:opacity-80"
          >
            Kullanım koşulları
          </Link>
        </p>
      </Container>
    </main>
  );
}
