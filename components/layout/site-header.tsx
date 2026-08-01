import Link from "next/link";
import { Search } from "lucide-react";

import { MobileNav, type NavItem } from "@/components/layout/mobile-nav";
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

const CORPORATE_NAV: NavItem[] = [
  { label: "Hakkımızda", href: "/hakkimizda" },
  { label: "Kaynaklar", href: "/kaynaklar" },
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
  const mobileItems = [...items, ...CORPORATE_NAV];

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
      <Container className="flex h-[72px] items-center justify-between gap-4 sm:h-[76px]">
        <div className="flex min-w-0 flex-1 items-center gap-5 lg:gap-8">
          <Logo size="md" />
          <nav
            aria-label="Ana menü"
            className="hidden items-center gap-0.5 lg:flex"
          >
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground xl:px-3"
              >
                {item.label}
              </Link>
            ))}
            <span className="mx-1.5 h-4 w-px bg-border" aria-hidden />
            {CORPORATE_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground xl:px-3"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <Link
            href="/arama"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Ara"
          >
            <Search className="h-5 w-5" aria-hidden />
          </Link>
          <ThemeToggle />
          <MobileNav items={mobileItems} />
        </div>
      </Container>
    </header>
  );
}
