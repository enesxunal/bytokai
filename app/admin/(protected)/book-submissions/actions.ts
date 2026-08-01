"use server";

import { z } from "zod";

import {
  failResult,
  okResult,
  toActionError,
  type ActionResult,
} from "@/lib/admin/action-result";
import { writeAuditLog } from "@/lib/admin/audit";
import {
  BOOK_SUBMISSION_STATUSES,
} from "@/lib/book-submissions/schema";
import { sendBookSubmissionEmails } from "@/lib/book-submissions/notify";
import { requireAdminAction } from "@/lib/auth/session";
import { getClientEnvSoft } from "@/lib/env";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("admin.book-submissions");

const updateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(BOOK_SUBMISSION_STATUSES),
  adminNotes: z
    .string()
    .max(5000)
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
});

export async function updateBookSubmission(
  input: z.infer<typeof updateSchema>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = updateSchema.parse(input);
    const { user, supabase } = await requireAdminAction();

    const { data: current, error: currentError } = await supabase
      .from("book_submissions")
      .select("id, status, admin_notes")
      .eq("id", parsed.id)
      .maybeSingle();

    if (currentError || !current) {
      return failResult("Başvuru bulunamadı");
    }

    const { error } = await supabase
      .from("book_submissions")
      .update({
        status: parsed.status,
        admin_notes: parsed.adminNotes,
      })
      .eq("id", parsed.id);

    if (error) {
      return failResult("Başvuru güncellenemedi");
    }

    await writeAuditLog(supabase, {
      actorId: user.id,
      action: "book_submission.update",
      entityType: "book_submission",
      entityId: parsed.id,
      beforeData: {
        status: current.status,
        admin_notes: current.admin_notes,
      },
      afterData: {
        status: parsed.status,
        admin_notes: parsed.adminNotes,
      },
    });

    return okResult({ id: parsed.id }, "Başvuru güncellendi");
  } catch (error) {
    return toActionError(error);
  }
}

export async function retryBookSubmissionNotification(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = z.string().uuid().parse(id);
    const { user, supabase } = await requireAdminAction();

    const { data: row, error } = await supabase
      .from("book_submissions")
      .select(
        "id, full_name, email, phone, book_title, book_genre, estimated_word_count, manuscript_status, synopsis, author_bio",
      )
      .eq("id", parsed)
      .maybeSingle();

    if (error || !row) {
      return failResult("Başvuru bulunamadı");
    }

    const siteUrl = getClientEnvSoft().NEXT_PUBLIC_SITE_URL;
    const notify = await sendBookSubmissionEmails({
      submissionId: row.id,
      fields: {
        fullName: row.full_name,
        email: row.email,
        phone: row.phone,
        bookTitle: row.book_title,
        bookGenre: row.book_genre as never,
        estimatedWordCount: row.estimated_word_count,
        manuscriptStatus: row.manuscript_status as never,
        synopsis: row.synopsis,
        authorBio: row.author_bio,
        consent: true,
        website: "",
      },
      siteUrl,
    });

    await supabase
      .from("book_submissions")
      .update({
        notification_status: notify.status,
        notification_error: notify.error,
      })
      .eq("id", row.id);

    await writeAuditLog(supabase, {
      actorId: user.id,
      action: "book_submission.retry_notification",
      entityType: "book_submission",
      entityId: row.id,
      afterData: { notification_status: notify.status },
    });

    if (notify.status === "failed") {
      logger.warn("Yeniden bildirim başarısız", { submissionId: row.id });
      return failResult("Bildirim gönderilemedi");
    }

    return okResult(
      { id: row.id },
      notify.status === "sent"
        ? "Bildirimler yeniden gönderildi"
        : "Bildirimler kısmen gönderildi",
    );
  } catch (error) {
    return toActionError(error);
  }
}

export async function createBookSubmissionDownloadLink(
  id: string,
): Promise<ActionResult<{ url: string }>> {
  try {
    const parsed = z.string().uuid().parse(id);
    const { user, supabase } = await requireAdminAction();

    const { data: row, error } = await supabase
      .from("book_submissions")
      .select("id, storage_path, original_filename")
      .eq("id", parsed)
      .maybeSingle();

    if (error || !row) {
      return failResult("Başvuru bulunamadı");
    }

    const { createBookSubmissionSignedUrl } = await import(
      "@/lib/admin/book-submissions"
    );
    const url = await createBookSubmissionSignedUrl(row.storage_path, 120);
    if (!url) {
      return failResult("İndirme bağlantısı oluşturulamadı");
    }

    await writeAuditLog(supabase, {
      actorId: user.id,
      action: "book_submission.download_link",
      entityType: "book_submission",
      entityId: row.id,
      afterData: { filename: row.original_filename },
    });

    return okResult({ url }, "İndirme bağlantısı hazır (2 dk)");
  } catch (error) {
    return toActionError(error);
  }
}
