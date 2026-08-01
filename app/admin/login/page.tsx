import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/auth-forms";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin girişi",
  robots: { index: false, follow: false },
};

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
    reset?: string;
  }>;
};

function sanitizeNext(next: string | undefined): string | undefined {
  if (!next) return undefined;
  if (!next.startsWith("/admin")) return undefined;
  if (next.startsWith("//") || next.includes("://") || next.includes("\\")) {
    return undefined;
  }
  if (
    next === "/admin/login" ||
    next === "/admin/forgot-password" ||
    next === "/admin/forbidden"
  ) {
    return undefined;
  }
  return next;
}

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const resetMode = params.reset === "1";
  const next = sanitizeNext(params.next);

  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <p className="font-[family-name:var(--font-ibm-plex-mono)] text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
            BYTOK AI
          </p>
          <h1 className="font-[family-name:var(--font-source-serif)] text-3xl font-semibold tracking-tight">
            {resetMode ? "Yeni şifre belirle" : "Admin girişi"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {resetMode
              ? "Hesabınız için güvenli bir şifre oluşturun."
              : "Yönetim paneline erişmek için oturum açın."}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <LoginForm next={next} resetMode={resetMode} />
        </div>
      </div>
    </div>
  );
}
