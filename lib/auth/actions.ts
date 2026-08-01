"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getClientEnvSoft } from "@/lib/env";
import { ValidationError } from "@/lib/utils/errors";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("auth.actions");

const loginSchema = z.object({
  email: z.string().email("Geçerli bir e-posta girin"),
  password: z.string().min(8, "Şifre en az 8 karakter olmalı"),
  next: z.string().optional(),
});

const resetPasswordSchema = z.object({
  email: z.string().email("Geçerli bir e-posta girin"),
});

const updatePasswordSchema = z
  .object({
    password: z.string().min(8, "Şifre en az 8 karakter olmalı"),
    confirmPassword: z.string().min(8, "Şifre tekrarı en az 8 karakter olmalı"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Şifreler eşleşmiyor",
    path: ["confirmPassword"],
  });

export type AuthActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key !== "string") {
      continue;
    }
    if (!fieldErrors[key]) {
      fieldErrors[key] = [];
    }
    fieldErrors[key].push(issue.message);
  }
  return fieldErrors;
}

function formDataToObject(formData: FormData): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      result[key] = value;
    }
  }
  return result;
}

function safeAdminRedirect(next: string | undefined): string {
  if (!next) {
    return "/admin";
  }

  if (
    !next.startsWith("/admin") ||
    next.startsWith("//") ||
    next.includes("://") ||
    next.includes("\\")
  ) {
    return "/admin";
  }

  try {
    const url = new URL(next, "http://localhost");
    if (url.origin !== "http://localhost") {
      return "/admin";
    }
    if (!url.pathname.startsWith("/admin")) {
      return "/admin";
    }
    if (
      url.pathname === "/admin/login" ||
      url.pathname === "/admin/forgot-password" ||
      url.pathname === "/admin/forbidden"
    ) {
      return "/admin";
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return "/admin";
  }
}

export async function login(
  _prevState: AuthActionState | null,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return {
      ok: false,
      message: "Form doğrulaması başarısız",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const { email, password, next } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    logger.warn("Login failed", { email, reason: error.message });
    return {
      ok: false,
      message: "E-posta veya şifre hatalı",
    };
  }

  logger.info("Login succeeded", { email });
  redirect(safeAdminRedirect(next));
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    logger.error("Logout failed", { reason: error.message });
    throw new ValidationError("Çıkış yapılamadı");
  }

  logger.info("Logout succeeded");
  redirect("/admin/login");
}

export async function resetPasswordRequest(
  _prevState: AuthActionState | null,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = resetPasswordSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return {
      ok: false,
      message: "Form doğrulaması başarısız",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const { email } = parsed.data;
  const supabase = await createClient();
  const siteUrl = getClientEnvSoft().NEXT_PUBLIC_SITE_URL;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/admin/login?reset=1`,
  });

  if (error) {
    logger.warn("Password reset request failed", {
      email,
      reason: error.message,
    });
    return {
      ok: false,
      message: "Şifre sıfırlama isteği gönderilemedi",
    };
  }

  logger.info("Password reset request sent", { email });

  return {
    ok: true,
    message:
      "Şifre sıfırlama bağlantısı e-posta adresinize gönderildi (varsa).",
  };
}

export async function updatePassword(
  _prevState: AuthActionState | null,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = updatePasswordSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return {
      ok: false,
      message: "Form doğrulaması başarısız",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      message: "Oturum bulunamadı. Lütfen sıfırlama bağlantısını yeniden isteyin.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    logger.warn("Password update failed", { reason: error.message });
    return {
      ok: false,
      message: "Şifre güncellenemedi. Bağlantının süresi dolmuş olabilir.",
    };
  }

  logger.info("Password updated", { userId: user.id });
  redirect("/admin");
}
