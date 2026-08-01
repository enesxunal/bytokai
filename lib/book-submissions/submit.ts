import "server-only";

import { headers } from "next/headers";

import { sendBookSubmissionEmails } from "@/lib/book-submissions/notify";
import {
  assertSubmissionAllowed,
  buildStoragePath,
  hashIp,
} from "@/lib/book-submissions/rate-limit";
import {
  bookSubmissionFieldsSchema,
  isAllowedUpload,
  resolveMimeType,
} from "@/lib/book-submissions/schema";
import { getClientEnvSoft } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/server";
import { createLogger } from "@/lib/utils/logger";
import { ZodError } from "zod";

const logger = createLogger("book-submissions.submit");

export type SubmitBookResult =
  | { ok: true; message: string; submissionId: string }
  | {
      ok: false;
      message: string;
      fieldErrors?: Record<string, string[]>;
    };

function fieldErrorsFromZod(error: ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_form";
    if (!fieldErrors[key]) fieldErrors[key] = [];
    fieldErrors[key].push(issue.message);
  }
  return fieldErrors;
}

async function readClientMeta(): Promise<{
  ipHash: string | null;
  userAgent: string | null;
}> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    const ip =
      forwarded?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      null;
    const userAgent = h.get("user-agent");
    return {
      ipHash: ip ? hashIp(ip) : null,
      userAgent: userAgent ? userAgent.slice(0, 500) : null,
    };
  } catch {
    return { ipHash: null, userAgent: null };
  }
}

export async function submitBookPublishingApplication(
  formData: FormData,
): Promise<SubmitBookResult> {
  const raw = {
    fullName: String(formData.get("fullName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    bookTitle: String(formData.get("bookTitle") ?? ""),
    bookGenre: String(formData.get("bookGenre") ?? ""),
    estimatedWordCount: String(formData.get("estimatedWordCount") ?? ""),
    manuscriptStatus: String(formData.get("manuscriptStatus") ?? ""),
    synopsis: String(formData.get("synopsis") ?? ""),
    authorBio: String(formData.get("authorBio") ?? ""),
    consent: formData.get("consent"),
    website: String(formData.get("website") ?? ""),
  };

  const parsed = bookSubmissionFieldsSchema.safeParse(raw);
  if (!parsed.success) {
    // Honeypot: look like success without storing
    if (raw.website && raw.website.trim() !== "") {
      return {
        ok: true,
        message: "Başvurunuz alındı. Teşekkürler.",
        submissionId: "ok",
      };
    }
    return {
      ok: false,
      message: "Form doğrulaması başarısız. Lütfen alanları kontrol edin.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  const fileEntry = formData.get("file");
  if (!(fileEntry instanceof File)) {
    return { ok: false, message: "Dosya zorunludur." };
  }

  const fileCheck = isAllowedUpload({
    name: fileEntry.name,
    type: fileEntry.type,
    size: fileEntry.size,
  });
  if (!fileCheck.ok) {
    return { ok: false, message: fileCheck.message };
  }

  const fields = parsed.data;
  const { ipHash, userAgent } = await readClientMeta();

  const rate = await assertSubmissionAllowed({
    email: fields.email,
    ipHash,
  });
  if (!rate.ok) {
    return { ok: false, message: rate.message };
  }

  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    logger.error("Service client oluşturulamadı");
    return {
      ok: false,
      message: "Başvuru şu an alınamıyor. Lütfen daha sonra tekrar deneyin.",
    };
  }

  const mimeType = resolveMimeType({
    name: fileEntry.name,
    type: fileEntry.type,
  });
  const storagePath = buildStoragePath(fileEntry.name);
  const buffer = Buffer.from(await fileEntry.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("book-submissions")
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
      metadata: {
        original_filename: fileEntry.name.slice(0, 255),
      },
    });

  if (uploadError) {
    logger.warn("Dosya yükleme başarısız", { reason: uploadError.message });
    return {
      ok: false,
      message: "Dosya yüklenemedi. Lütfen tekrar deneyin.",
    };
  }

  const consentAt = new Date().toISOString();
  const { data: row, error: insertError } = await supabase
    .from("book_submissions")
    .insert({
      full_name: fields.fullName,
      email: fields.email,
      phone: fields.phone,
      book_title: fields.bookTitle,
      book_genre: fields.bookGenre,
      estimated_word_count: fields.estimatedWordCount,
      manuscript_status: fields.manuscriptStatus,
      synopsis: fields.synopsis,
      author_bio: fields.authorBio,
      storage_path: storagePath,
      original_filename: fileEntry.name.slice(0, 255),
      mime_type: mimeType,
      file_size: fileEntry.size,
      status: "new",
      consent_at: consentAt,
      ip_hash: ipHash,
      user_agent: userAgent,
      notification_status: "pending",
    })
    .select("id")
    .single();

  if (insertError || !row) {
    logger.error("Başvuru kaydı oluşturulamadı", {
      reason: insertError?.message ?? "missing_row",
    });
    await supabase.storage.from("book-submissions").remove([storagePath]);
    return {
      ok: false,
      message: "Başvuru kaydedilemedi. Lütfen daha sonra tekrar deneyin.",
    };
  }

  const siteUrl = getClientEnvSoft().NEXT_PUBLIC_SITE_URL;
  const notify = await sendBookSubmissionEmails({
    submissionId: row.id,
    fields,
    siteUrl,
  });

  await supabase
    .from("book_submissions")
    .update({
      notification_status: notify.status,
      notification_error: notify.error,
    })
    .eq("id", row.id);

  if (notify.status !== "sent") {
    logger.warn("Bildirim tamamlanamadı", {
      submissionId: row.id,
      status: notify.status,
    });
  }

  return {
    ok: true,
    message: "Başvurunuz alındı. Teşekkürler.",
    submissionId: row.id,
  };
}
