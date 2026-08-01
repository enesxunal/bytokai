"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  createBookSubmissionDownloadLink,
  retryBookSubmissionNotification,
  updateBookSubmission,
} from "@/app/admin/(protected)/book-submissions/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  BOOK_SUBMISSION_STATUS_LABELS,
  BOOK_SUBMISSION_STATUSES,
  type BookSubmissionStatus,
} from "@/lib/book-submissions/schema";
import type { AdminBookSubmissionDetail } from "@/lib/admin/book-submissions";
import { formatIstanbul } from "@/lib/utils/date";

function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    return formatIstanbul(value, "dd MMM yyyy HH:mm");
  } catch {
    return "—";
  }
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function BookSubmissionDetailView({
  submission,
}: {
  submission: AdminBookSubmissionDetail;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<BookSubmissionStatus>(submission.status);
  const [notes, setNotes] = useState(submission.admin_notes ?? "");

  function save() {
    startTransition(async () => {
      const result = await updateBookSubmission({
        id: submission.id,
        status,
        adminNotes: notes,
      });
      if (result.ok) {
        toast.success(result.message ?? "Kaydedildi");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  function download() {
    startTransition(async () => {
      const result = await createBookSubmissionDownloadLink(submission.id);
      if (result.ok) {
        window.open(result.data.url, "_blank", "noopener,noreferrer");
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  function retryNotify() {
    startTransition(async () => {
      const result = await retryBookSubmissionNotification(submission.id);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/admin/book-submissions" className="hover:text-foreground">
              Kitap Başvuruları
            </Link>
            {" / "}
            Detay
          </p>
          <h1 className="mt-1 font-sans text-2xl font-semibold tracking-tight">
            {submission.book_title}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={pending} onClick={download}>
            Dosyayı indir
          </Button>
          {submission.notification_status !== "sent" ? (
            <Button variant="secondary" disabled={pending} onClick={retryNotify}>
              Bildirimi yeniden gönder
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3 rounded-lg border border-border p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Başvuran
          </h2>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Ad soyad</dt>
              <dd>{submission.full_name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">E-posta</dt>
              <dd>{submission.email}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Telefon</dt>
              <dd>{submission.phone || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Başvuru tarihi</dt>
              <dd>{formatDate(submission.created_at)}</dd>
            </div>
          </dl>
        </section>

        <section className="space-y-3 rounded-lg border border-border p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Eser
          </h2>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Tür</dt>
              <dd>{submission.book_genre}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Durum (eser)</dt>
              <dd>{submission.manuscript_status}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Kelime</dt>
              <dd>{submission.estimated_word_count ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Dosya</dt>
              <dd>
                {submission.original_filename} ·{" "}
                {formatBytes(submission.file_size)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Bildirim</dt>
              <dd>
                {submission.notification_status}
                {submission.notification_error
                  ? ` (${submission.notification_error})`
                  : ""}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="space-y-2 rounded-lg border border-border p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Kısa özet
        </h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {submission.synopsis}
        </p>
      </section>

      <section className="space-y-2 rounded-lg border border-border p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Yazar biyografisi
        </h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {submission.author_bio}
        </p>
      </section>

      <section className="space-y-4 rounded-lg border border-border p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Yönetim
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="status">Durum</Label>
            <select
              id="status"
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as BookSubmissionStatus)
              }
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              disabled={pending}
            >
              {BOOK_SUBMISSION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {BOOK_SUBMISSION_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Admin notu</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            disabled={pending}
          />
        </div>
        <Button onClick={save} disabled={pending}>
          Kaydet
        </Button>
      </section>
    </div>
  );
}
