"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import {
  login,
  resetPasswordRequest,
  updatePassword,
  type AuthActionState,
} from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionState = {
  ok: false,
  message: "",
};

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-xs text-destructive">{errors[0]}</p>;
}

function FormMessage({ state }: { state: AuthActionState }) {
  if (!state.message) return null;
  return (
    <p
      role="status"
      className={`rounded-md border px-3 py-2 text-sm ${
        state.ok
          ? "border-success/30 bg-success-foreground text-success"
          : "border-destructive/30 bg-destructive-foreground text-destructive"
      }`}
    >
      {state.message}
    </p>
  );
}

export function LoginForm({
  next,
  resetMode = false,
}: {
  next?: string;
  resetMode?: boolean;
}) {
  if (resetMode) {
    return <UpdatePasswordForm />;
  }

  return <SignInForm next={next} />;
}

function SignInForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(login, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <div className="space-y-2">
        <Label htmlFor="email">E-posta</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={pending}
          placeholder="admin@ornek.com"
        />
        <FieldError errors={state.fieldErrors?.email} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="password">Şifre</Label>
          <Link
            href="/admin/forgot-password"
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Şifremi unuttum
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            minLength={8}
            disabled={pending}
            className="pr-10"
            placeholder="En az 8 karakter"
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <FieldError errors={state.fieldErrors?.password} />
      </div>

      <FormMessage state={state} />

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="animate-spin" />
            Giriş yapılıyor…
          </>
        ) : (
          "Giriş yap"
        )}
      </Button>
    </form>
  );
}

function UpdatePasswordForm() {
  const [state, formAction, pending] = useActionState(
    updatePassword,
    initialState,
  );
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Yeni şifrenizi belirleyin. Bağlantı tek kullanımlıktır.
      </p>

      <div className="space-y-2">
        <Label htmlFor="password">Yeni şifre</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            disabled={pending}
            className="pr-10"
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <FieldError errors={state.fieldErrors?.password} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Yeni şifre (tekrar)</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          required
          minLength={8}
          disabled={pending}
        />
        <FieldError errors={state.fieldErrors?.confirmPassword} />
      </div>

      <FormMessage state={state} />

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="animate-spin" />
            Kaydediliyor…
          </>
        ) : (
          "Şifreyi güncelle"
        )}
      </Button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    resetPasswordRequest,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">E-posta</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={pending}
          placeholder="admin@ornek.com"
        />
        <FieldError errors={state.fieldErrors?.email} />
      </div>

      <FormMessage state={state} />

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="animate-spin" />
            Gönderiliyor…
          </>
        ) : (
          "Sıfırlama bağlantısı gönder"
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/admin/login"
          className="underline-offset-4 hover:text-foreground hover:underline"
        >
          Giriş sayfasına dön
        </Link>
      </p>
    </form>
  );
}
