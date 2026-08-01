import Link from "next/link";

import { buildNavItems } from "@/components/layout/site-header";
import { Container } from "@/components/shared/container";
import { Logo } from "@/components/shared/logo";
import type { DbCategory, PublicSiteSettings } from "@/lib/database/types";

type SiteFooterProps = {
  settings: PublicSiteSettings;
  categories?: DbCategory[];
};

const CORPORATE_LINKS = [
  { label: "Hakkımızda", href: "/hakkimizda" },
  { label: "Editoryal politika", href: "/editoryal-politika" },
  { label: "Kitap Yayınlat", href: "/kitap-yayinlat" },
  { label: "Kaynaklar", href: "/kaynaklar" },
  { label: "Gizlilik", href: "/gizlilik" },
  { label: "Kullanım koşulları", href: "/kullanim-kosullari" },
] as const;

const BRAND_LINE =
  "Yapay zekâ ve teknoloji dünyasından kaynaklı Türkçe haberler.";

function isHttpUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function SiteFooter({ settings, categories = [] }: SiteFooterProps) {
  const navItems = buildNavItems(categories);
  const year = new Date().getFullYear();
  const social = settings.social_links;
  const xUrl = isHttpUrl(social.x)
    ? social.x
    : isHttpUrl(social.twitter)
      ? social.twitter
      : null;
  const linkedinUrl = isHttpUrl(social.linkedin) ? social.linkedin : null;

  return (
    <footer className="mt-auto border-t border-border bg-card/30">
      <Container className="py-8 sm:py-9">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.2fr_repeat(3,minmax(0,1fr))] lg:gap-10">
          <div className="space-y-3 sm:col-span-2 lg:col-span-1">
            <Logo size="sm" />
            <p className="max-w-xs text-sm leading-relaxed text-foreground/65">
              {BRAND_LINE}
            </p>
          </div>

          <div>
            <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Kategoriler
            </h2>
            <ul className="mt-3 space-y-2">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="inline-flex min-h-10 items-center text-sm text-foreground/90 transition-colors hover:text-primary sm:min-h-0 sm:py-0.5"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Kurumsal
            </h2>
            <ul className="mt-3 space-y-2">
              {CORPORATE_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="inline-flex min-h-10 items-center text-sm text-foreground/90 transition-colors hover:text-primary sm:min-h-0 sm:py-0.5"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Bağlantılar
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              {xUrl ? (
                <li>
                  <a
                    href={xUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-10 items-center transition-colors hover:text-primary sm:min-h-0"
                  >
                    X
                  </a>
                </li>
              ) : null}
              {linkedinUrl ? (
                <li>
                  <a
                    href={linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-10 items-center transition-colors hover:text-primary sm:min-h-0"
                  >
                    LinkedIn
                  </a>
                </li>
              ) : null}
              {!xUrl && !linkedinUrl ? (
                <li className="text-foreground/55">Yakında</li>
              ) : null}
            </ul>
          </div>
        </div>
      </Container>

      <div className="border-t border-border">
        <Container className="flex flex-col gap-1 py-3.5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {settings.site_name}. Tüm hakları saklıdır.
          </p>
          <p>Kaynaklı · Özgün · Türkçe</p>
        </Container>
      </div>
    </footer>
  );
}
