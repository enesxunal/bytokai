import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/shared/container";
import { getSiteSettings } from "@/lib/database/settings";
import { absoluteUrl } from "@/lib/listing/helpers";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = "Editoryal politika";
  const description =
    "BYTOK AI’ın kaynak gösterme, özgünleştirme, doğruluk, düzeltme ve telif politikası.";
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
      "Kaynak listemiz kamuya açık olarak Kaynaklar sayfasında yer alır. Takip edilen bölüm bağlantıları da bu sayfada paylaşılır.",
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
      "Yayın öncesi süreçte kaynak gerçeklerine bağlılık, abartılı iddia, uydurma detay ve düşük güven sinyalleri kontrol edilir. Kaynakta olmayan sayı, tarih, alıntı veya teknik iddia üretilmemesi hedeflenir.",
      "Kontrollere rağmen hata olasılığı vardır; bu nedenle düzeltme politikamız aktiftir.",
    ],
  },
  {
    id: "duzeltme",
    title: "Düzeltme politikası",
    body: [
      "Yayın sonrası fark edilen olgusal hatalar, mümkün olan en kısa sürede düzeltilir. Anlamı değiştiren düzeltmelerde içerik güncellenir; gerekirse editoryal not eklenir.",
      "Düzeltme talepleri için sitede yayımlanan iletişim kanallarını kullanabilirsiniz. Talepler incelenir; her talep otomatik kabul edilmez.",
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
    id: "yayin-esikleri",
    title: "Yayın eşikleri",
    body: [
      "Güven skoru düşük, risk bayrağı yüksek veya kalite kontrolünden geçemeyen içerikler otomatik olarak yayınlanmaz. Bu tür içerikler taslak, inceleme veya reddedilmiş durumda tutulabilir.",
      "Belirsiz, çelişkili veya yüksek riskli konular ek incelemeye bırakılabilir.",
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
            kaynak, doğruluk ve telif ilkelerini özetler.
          </p>
        </header>

        <div className="space-y-10">
          {SECTIONS.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-2xl font-semibold tracking-tight">
                {section.title}
              </h2>
              {section.body.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 48)}
                  className="text-sm leading-relaxed text-muted-foreground sm:text-base"
                >
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
      </Container>
    </main>
  );
}
