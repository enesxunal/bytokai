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
  { label: "Kaynaklar", href: "/kaynaklar" },
  { label: "Gizlilik", href: "/gizlilik" },
  { label: "Kullanım koşulları", href: "/kullanim-kosullari" },
] as const;

export function SiteFooter({ settings, categories = [] }: SiteFooterProps) {
  const navItems = buildNavItems(categories);
  const year = new Date().getFullYear();
  const social = settings.social_links;

  return (
    <footer className="mt-auto border-t border-border bg-card/40">
      <Container className="grid gap-8 py-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6 lg:py-9">
        <div className="space-y-3 lg:col-span-1">
          <Logo size="sm" />
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            {settings.site_tagline}
          </p>
        </div>

        <div>
          <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Kategoriler
          </h2>
          <ul className="mt-3 space-y-1.5">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm text-foreground/90 transition-colors hover:text-primary"
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
          <ul className="mt-3 space-y-1.5">
            {CORPORATE_LINKS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm text-foreground/90 transition-colors hover:text-primary"
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
          <ul className="mt-3 space-y-1.5 text-sm">
            {social.x || social.twitter ? (
              <li>
                <a
                  href={social.x ?? social.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-primary"
                >
                  X
                </a>
              </li>
            ) : null}
            {social.linkedin ? (
              <li>
                <a
                  href={social.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-primary"
                >
                  LinkedIn
                </a>
              </li>
            ) : null}
          </ul>
        </div>
      </Container>

      <div className="border-t border-border">
        <Container className="flex flex-col gap-1.5 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {settings.site_name}. Tüm hakları saklıdır.
          </p>
          <p>Kaynaklı · Özgün · Türkçe teknoloji yayını</p>
        </Container>
      </div>
    </footer>
  );
}
