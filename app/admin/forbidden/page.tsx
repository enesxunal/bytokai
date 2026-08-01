import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Erişim reddedildi",
  robots: { index: false, follow: false },
};

export default async function AdminForbiddenPage() {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg space-y-6 text-center">
        <p className="font-[family-name:var(--font-ibm-plex-mono)] text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
          403
        </p>
        <h1 className="font-[family-name:var(--font-source-serif)] text-3xl font-semibold tracking-tight">
          Erişim reddedildi
        </h1>
        <p className="text-sm text-muted-foreground">
          Bu alan yalnızca yönetici (admin) rolüne sahip hesaplar içindir.
          {user?.email ? (
            <>
              {" "}
              Giriş yapılan hesap: <span className="text-foreground">{user.email}</span>
            </>
          ) : null}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="outline">
            <Link href="/">Ana sayfaya dön</Link>
          </Button>
          {user ? (
            <form action={logout}>
              <Button type="submit" variant="destructive">
                Çıkış yap
              </Button>
            </form>
          ) : (
            <Button asChild>
              <Link href="/admin/login">Giriş yap</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
