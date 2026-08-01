"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Bot,
  CalendarDays,
  ExternalLink,
  FolderTree,
  Inbox,
  LayoutDashboard,
  Menu,
  Newspaper,
  Rss,
  ScrollText,
  Settings,
  Sparkles,
  Tags,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NAV_ITEMS } from "@/lib/admin/labels";
import { logout } from "@/lib/auth/actions";
import { cn } from "@/lib/utils/cn";

const ICONS: Record<(typeof NAV_ITEMS)[number]["icon"], LucideIcon> = {
  LayoutDashboard,
  Newspaper,
  Inbox,
  CalendarDays,
  Rss,
  Users,
  FolderTree,
  Tags,
  Bot,
  Sparkles,
  ScrollText,
  Settings,
};

function isNavActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function AdminNavLinks({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Yönetim menüsü" className={cn("flex flex-col gap-0.5", className)}>
      {NAV_ITEMS.map((item) => {
        const Icon = ICONS[item.icon];
        const active = isNavActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-primary/15 font-medium text-primary"
                : "text-admin-muted hover:bg-white/5 hover:text-admin-fg",
            )}
          >
            <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarBrand() {
  return (
    <Link href="/admin" className="block px-3 py-1">
      <p className="font-mono text-[0.65rem] font-medium tracking-[0.18em] text-admin-muted uppercase">
        BYTOK AI
      </p>
      <p className="mt-0.5 text-sm font-semibold tracking-tight text-admin-fg">
        Yönetim
      </p>
    </Link>
  );
}

export function AdminShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="admin-shell flex min-h-full flex-1">
      <aside
        className="admin-sidebar fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-admin-border lg:flex"
        aria-label="Yan menü"
      >
        <div className="flex h-14 items-center border-b border-admin-border px-3">
          <SidebarBrand />
        </div>
        <ScrollArea className="flex-1 px-2 py-3">
          <AdminNavLinks />
        </ScrollArea>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <header className="admin-header sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-card/95 px-3 backdrop-blur-sm sm:px-5">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="lg:hidden"
                aria-label="Menüyü aç"
              >
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="admin-sidebar w-[min(100%,18rem)] border-admin-border bg-[var(--admin-bg)] p-0 text-admin-fg"
            >
              <SheetHeader className="border-b border-admin-border px-3 py-3 text-left">
                <SheetTitle className="sr-only">Yönetim menüsü</SheetTitle>
                <SheetDescription className="sr-only">
                  Admin paneli gezinme bağlantıları
                </SheetDescription>
                <SidebarBrand />
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-4.5rem)] px-2 py-3">
                <AdminNavLinks onNavigate={() => setMobileOpen(false)} />
              </ScrollArea>
            </SheetContent>
          </Sheet>

          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-[0.65rem] tracking-[0.14em] text-muted-foreground uppercase lg:hidden">
              BYTOK AI Admin
            </p>
            <p className="truncate text-sm text-muted-foreground" title={email}>
              {email}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-3.5" aria-hidden />
                <span className="hidden sm:inline">Siteyi Görüntüle</span>
                <span className="sm:hidden">Site</span>
              </Link>
            </Button>
            <form action={logout}>
              <Button type="submit" variant="secondary" size="sm">
                Çıkış
              </Button>
            </form>
          </div>
        </header>

        <main className="admin-main flex-1 px-3 py-6 sm:px-5 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
