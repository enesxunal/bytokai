import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/admin/auth-forms";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Şifre sıfırlama",
  robots: { index: false, follow: false },
};

export default function AdminForgotPasswordPage() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <p className="font-[family-name:var(--font-ibm-plex-mono)] text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
            BYTOK AI
          </p>
          <h1 className="font-[family-name:var(--font-inter)] text-3xl font-semibold tracking-tight">
            Şifre sıfırlama
          </h1>
          <p className="text-sm text-muted-foreground">
            Kayıtlı e-posta adresinize bir sıfırlama bağlantısı gönderilir.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
