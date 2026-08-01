import "server-only";

import { sendMail } from "@/lib/mail/smtp";
import { maskSmtpUser, getSmtpConfig } from "@/lib/mail/smtp-config";
import { createLogger } from "@/lib/utils/logger";
import type { BookSubmissionFields } from "@/lib/book-submissions/schema";

const logger = createLogger("book-submissions.mail");

export type NotificationOutcome = {
  status: "sent" | "partial" | "failed";
  error: string | null;
};

export async function sendBookSubmissionEmails(input: {
  submissionId: string;
  fields: BookSubmissionFields;
  siteUrl: string;
}): Promise<NotificationOutcome> {
  const config = getSmtpConfig();
  if (!config) {
    logger.warn("SMTP yapılandırması eksik; bildirim atlandı");
    return { status: "failed", error: "smtp_not_configured" };
  }

  logger.info("SMTP bildirimi başlıyor", {
    smtpUser: maskSmtpUser(config.user),
    host: config.host,
  });

  const adminUrl = `${input.siteUrl.replace(/\/$/, "")}/admin/book-submissions/${input.submissionId}`;
  const wordCount =
    input.fields.estimatedWordCount == null
      ? "Belirtilmedi"
      : String(input.fields.estimatedWordCount);

  const adminText = [
    "Yeni bir kitap yayın başvurusu alındı.",
    "",
    `Başvuru ID: ${input.submissionId}`,
    `Ad soyad: ${input.fields.fullName}`,
    `E-posta: ${input.fields.email}`,
    `Telefon: ${input.fields.phone ?? "Belirtilmedi"}`,
    `Kitap adı: ${input.fields.bookTitle}`,
    `Kitap türü: ${input.fields.bookGenre}`,
    `Eser durumu: ${input.fields.manuscriptStatus}`,
    `Tahmini kelime sayısı: ${wordCount}`,
    "",
    "Kısa özet:",
    input.fields.synopsis,
    "",
    `Başvuru tarihi: ${new Date().toISOString()}`,
    `Admin: ${adminUrl}`,
  ].join("\n");

  const applicantText = [
    `Merhaba ${input.fields.fullName},`,
    "",
    `${input.fields.bookTitle} başlıklı eseriniz için yayın başvurunuzu aldık.`,
    "Editoryal değerlendirme sonrasında sizinle e-posta üzerinden iletişime geçeceğiz.",
    "",
    `Başvuru numaranız: ${input.submissionId}`,
    "",
    "BYTOK AI",
  ].join("\n");

  let adminOk = false;
  let applicantOk = false;
  const errors: string[] = [];

  try {
    await sendMail({
      to: config.bookSubmissionTo,
      subject: `Yeni kitap başvurusu: ${input.fields.bookTitle}`,
      text: adminText,
    });
    adminOk = true;
  } catch {
    errors.push("admin_notify_failed");
    logger.warn("Yönetici bildirimi gönderilemedi");
  }

  try {
    await sendMail({
      to: input.fields.email,
      subject: "Kitap başvurunuzu aldık",
      text: applicantText,
    });
    applicantOk = true;
  } catch {
    errors.push("applicant_notify_failed");
    logger.warn("Başvuru sahibi bildirimi gönderilemedi");
  }

  if (adminOk && applicantOk) {
    return { status: "sent", error: null };
  }
  if (adminOk || applicantOk) {
    return { status: "partial", error: errors.join(",") };
  }
  return { status: "failed", error: errors.join(",") || "notify_failed" };
}
