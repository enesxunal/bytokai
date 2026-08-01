"use server";

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

  // Supabase / newsletter servisi bağlandığında burada kayıt yapılacak.
  return {
    ok: true,
    message: "Bültene kaydınız alındı. Teşekkürler!",
  };
}
