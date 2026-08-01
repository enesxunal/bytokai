import Link from "next/link";
import { Search } from "lucide-react";

import {
  DesktopCategoryNav,
  MobileNav,
  type NavItem,
} from "@/components/layout/mobile-nav";
import { Container } from "@/components/shared/container";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import type { DbCategory } from "@/lib/database/types";

export type { NavItem };

const FALLBACK_NAV: NavItem[] = [
  { label: "Yapay Zekâ", href: "/kategori/yapay-zeka" },
  { label: "Geliştirici", href: "/kategori/gelistirici" },
  { label: "İş Dünyası", href: "/kategori/is-dunyasi" },
  { label: "Araştırma", href: "/kategori/arastirma" },
  { label: "Yorum", href: "/kategori/yorum" },
];

const PRIMARY_SLUGS = new Set([
  "yapay-zeka",
  "gelistirici",
  "is-dunyasi",
  "arastirma",
  "yorum",
]);

export const CORPORATE_NAV: NavItem[] = [
  { label: "Hakkımızda", href: "/hakkimizda" },
  { label: "Kaynaklar", href: "/kaynaklar" },
  { label: "Kitap Yayınlat", href: "/kitap-yayinlat" },
  { label: "Editoryal politika", href: "/editoryal-politika" },
  { label: "Gizlilik", href: "/gizlilik" },
  { label: "Kullanım koşulları", href: "/kullanim-kosullari" },
];

type SiteHeaderProps = {
  categories?: DbCategory[];
};

export function buildNavItems(categories: DbCategory[] = []): NavItem[] {
  const fromDb = categories
    .filter((c) => PRIMARY_SLUGS.has(c.slug))
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => ({ label: c.name, href: `/kategori/${c.slug}` }));

  return fromDb.length > 0 ? fromDb : FALLBACK_NAV;
}

export function SiteHeader({ categories = [] }: SiteHeaderProps) {
  const items = buildNavItems(categories);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur-[6px] supports-[backdrop-filter]:bg-background/85">
      <Container className="grid h-[72px] grid-cols-[1fr_auto] items-center gap-2 sm:h-[76px] lg:grid-cols-[auto_1fr_auto] lg:gap-6">
        <div className="min-w-0 justify-self-start">
          <Logo size="md" />
        </div>

        <DesktopCategoryNav items={items} />

        <div className="flex shrink-0 items-center justify-self-end gap-0.5">
          <Link
            href="/arama"
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Ara"
          >
            <Search className="h-5 w-5" aria-hidden />
          </Link>
          <ThemeToggle />
          <MobileNav categoryItems={items} corporateItems={CORPORATE_NAV} />
        </div>
      </Container>
    </header>
  );
}
