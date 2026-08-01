"use server";

import { getPublicAnonClient } from "@/lib/database/safe-client";

export type NewsletterResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export async function subscribeNewsletter(
  email: string,
): Promise<NewsletterResult> {
  const trimmed = email.trim().toLowerCase();

  if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return {
      ok: false,
      message: "Geçerli bir e-posta adresi girin.",
    };
  }

  const supabase = getPublicAnonClient();
  if (!supabase) {
    return {
      ok: false,
      message: "Bülten kaydı şu an kullanılamıyor. Lütfen daha sonra deneyin.",
    };
  }

  const { error } = await supabase.from("newsletter_subscribers").insert({
    email: trimmed,
    status: "active",
  });

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        message: "Bu e-posta adresi zaten bültene kayıtlı.",
      };
    }

    return {
      ok: false,
      message: "Kayıt tamamlanamadı. Lütfen daha sonra tekrar deneyin.",
    };
  }

  return {
    ok: true,
    message: "Bültene kaydınız alındı. Teşekkürler!",
  };
}
