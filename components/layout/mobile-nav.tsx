"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useId, useState } from "react";

import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils/cn";

export type NavItem = {
  label: string;
  href: string;
};

type MobileNavProps = {
  categoryItems: NavItem[];
  corporateItems: NavItem[];
};

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DesktopCategoryNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname() ?? "/";

  return (
    <nav
      aria-label="Ana menü"
      className="hidden items-center justify-center gap-1 lg:flex"
    >
      {items.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
            {active ? (
              <span
                className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-primary"
                aria-hidden
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav({ categoryItems, corporateItems }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? "/";
  const panelId = useId();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 lg:hidden"
          aria-label={open ? "Menüyü kapat" : "Menüyü aç"}
          aria-expanded={open}
          aria-controls={panelId}
        >
          <Menu className="h-5 w-5" aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent
        id={panelId}
        side="right"
        className="flex w-[min(100vw,20rem)] flex-col gap-0 p-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
      >
        <SheetHeader className="border-b border-border px-5 py-4 text-left">
          <SheetTitle className="sr-only">Navigasyon</SheetTitle>
          <Logo size="sm" href="/" />
        </SheetHeader>

        <nav
          aria-label="Mobil menü"
          className="flex flex-1 flex-col overflow-y-auto px-3 py-4"
        >
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Kategoriler
          </p>
          <ul className="space-y-0.5">
            {categoryItems.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center rounded-lg px-3 text-base font-medium transition-colors",
                      active
                        ? "bg-muted text-foreground"
                        : "text-foreground/90 hover:bg-muted/70",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="my-4 border-t border-border" />

          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Kurumsal
          </p>
          <ul className="space-y-0.5">
            {corporateItems.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center rounded-lg px-3 text-base font-medium transition-colors",
                      active
                        ? "bg-muted text-foreground"
                        : "text-foreground/90 hover:bg-muted/70",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
