import Link from "next/link";

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
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between gap-4 sm:h-[4.25rem]">
        <div className="flex min-w-0 items-center gap-6">
          <Logo size="md" />
          <nav
            aria-label="Ana menü"
            className="hidden items-center gap-1 lg:flex"
          >
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
            <span
              className="mx-1 h-4 w-px bg-border"
              aria-hidden
            />
            {CORPORATE_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <MobileNav items={mobileItems} />
        </div>
      </Container>
    </header>
  );
}
