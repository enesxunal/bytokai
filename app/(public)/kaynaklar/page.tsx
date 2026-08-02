import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Newspaper } from "lucide-react";

import { Container } from "@/components/shared/container";
import { EmptyState } from "@/components/shared/empty-state";
import { hasSupabaseEnv } from "@/lib/database/safe-client";
import { getSources } from "@/lib/database/sources";
import { getSiteSettings } from "@/lib/database/settings";
import type { DbSource } from "@/lib/database/types";
import { absoluteUrl } from "@/lib/listing/helpers";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = "Kaynaklar";
  const description =
    "BYTOK AI’ın takip ettiği aktif haber kaynakları, bölüm bağlantıları ve kaynak kullanımına dair açıklama.";
  const canonical = absoluteUrl(settings.site_url, "/kaynaklar");

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

const ATTRIBUTION_TEXT =
  "BYTOK AI bu kaynağı haber üretiminde referans olarak kullanır. Temel gerçekler kaynağa dayanır; metin özgün Türkçe olarak yeniden yazılır. Her haberde kaynak adı ve mümkün olduğunda orijinal bağlantı gösterilir. Amaç kaynak metni kopyalamak değil, olgu düzeyinde atıf yaparak özgün bir yayın üretmektir.";

function sourceDescription(source: DbSource): string {
  const language =
    source.default_language === "tr"
      ? "Türkçe"
      : source.default_language === "en"
        ? "İngilizce"
        : source.default_language.toUpperCase();

  const channel =
    source.ingestion_type === "rss"
      ? "RSS beslemesi"
      : source.ingestion_type === "html"
        ? "web bölümü taraması"
        : "manuel takip";

  return `${source.name}, BYTOK AI tarafından ${language} odaklı ${channel} ile izlenen aktif bir haber kaynağıdır.`;
}

export default async function SourcesPage() {
  const connected = hasSupabaseEnv();
  const [settings, sources] = await Promise.all([
    getSiteSettings(),
    getSources(),
  ]);

  return (
    <main>
      <Container size="md" className="space-y-10 py-10 sm:py-14">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="transition-colors hover:text-foreground">
                Ana sayfa
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li className="text-foreground/80" aria-current="page">
              Kaynaklar
            </li>
          </ol>
        </nav>

        <header className="space-y-4 border-b border-border pb-8">
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Kurumsal
          </p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            Kaynaklar
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground text-pretty">
            Aşağıda {settings.site_name} tarafından aktif olarak takip edilen
            haber kaynakları listelenir. Kaynak kullanımı, atıf ve özgünleştirme
            ilkeleri için{" "}
            <Link
              href="/editoryal-politika"
              className="text-primary transition-opacity hover:opacity-80"
            >
              editoryal politikamıza
            </Link>{" "}
            bakabilirsiniz.
          </p>
        </header>

        {!connected ? (
          <EmptyState
            icon={Newspaper}
            title="Kaynak listesi şu an görüntülenemiyor"
            description="Veritabanı bağlantısı yapılandırılmadığı için aktif kaynaklar yüklenemedi. Bağlantı sağlandığında bu sayfada kaynak adı, açıklama ve bağlantılar listelenir."
          />
        ) : sources.length === 0 ? (
          <EmptyState
            icon={Newspaper}
            title="Aktif kaynak bulunamadı"
            description="Şu an listelenecek etkin haber kaynağı yok. Kaynaklar eklendiğinde burada görünecektir."
          />
        ) : (
          <ul className="space-y-5">
            {sources.map((source) => (
              <li
                key={source.id}
                className="rounded-2xl border border-border bg-card/60 p-5 sm:p-6"
              >
                <h2 className="font-serif text-xl font-semibold tracking-tight">
                  {source.name}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {sourceDescription(source)}
                </p>

                <dl className="mt-5 space-y-3 text-sm">
                  <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
                    <dt className="shrink-0 font-medium text-foreground sm:w-40">
                      Ana site
                    </dt>
                    <dd>
                      <a
                        href={source.homepage_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-primary transition-opacity hover:opacity-80"
                      >
                        {source.homepage_url}
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </a>
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
                    <dt className="shrink-0 font-medium text-foreground sm:w-40">
                      Takip edilen bölüm
                    </dt>
                    <dd>
                      <a
                        href={source.section_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-primary transition-opacity hover:opacity-80"
                      >
                        {source.section_url}
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </a>
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
                    <dt className="shrink-0 font-medium text-foreground sm:w-40">
                      Kullanım ve atıf
                    </dt>
                    <dd className="leading-relaxed text-muted-foreground">
                      {ATTRIBUTION_TEXT}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </main>
  );
}
