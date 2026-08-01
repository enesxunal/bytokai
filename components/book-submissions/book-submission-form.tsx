"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { submitBookPublishingForm } from "@/app/actions/book-submission";
import {
  BOOK_GENRES,
  MANUSCRIPT_STATUSES,
  MAX_FILE_BYTES,
} from "@/lib/book-submissions/schema";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils/cn";

type FieldErrors = Record<string, string[]>;

export function BookSubmissionForm() {
  const [pending, setPending] = React.useState(false);
  const [status, setStatus] = React.useState<
    null | { type: "success" | "error"; message: string }
  >(null);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [consent, setConsent] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setStatus(null);
    setFieldErrors({});

    const form = event.currentTarget;
    const formData = new FormData(form);
    if (consent) {
      formData.set("consent", "on");
    } else {
      formData.delete("consent");
    }

    try {
      const result = await submitBookPublishingForm(formData);
      if (result.ok) {
        setStatus({ type: "success", message: result.message });
        form.reset();
        setConsent(false);
      } else {
        setStatus({ type: "error", message: result.message });
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
      }
    } catch {
      setStatus({
        type: "error",
        message: "Başvuru gönderilemedi. Lütfen daha sonra tekrar deneyin.",
      });
    } finally {
      setPending(false);
    }
  }

  function errorFor(key: string): string | undefined {
    return fieldErrors[key]?.[0];
  }

  return (
    <form
      ref={formRef}
      onSubmit={(e) => void onSubmit(e)}
      className="space-y-6"
      noValidate
    >
      {/* Honeypot */}
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
        <Label htmlFor="website">Website</Label>
        <Input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Ad soyad *</Label>
          <Input id="fullName" name="fullName" required maxLength={120} disabled={pending} />
          {errorFor("fullName") ? (
            <p className="text-sm text-destructive">{errorFor("fullName")}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">E-posta *</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            disabled={pending}
          />
          {errorFor("email") ? (
            <p className="text-sm text-destructive">{errorFor("email")}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Telefon</Label>
          <Input id="phone" name="phone" type="tel" maxLength={40} disabled={pending} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bookTitle">Kitap adı *</Label>
          <Input id="bookTitle" name="bookTitle" required maxLength={200} disabled={pending} />
          {errorFor("bookTitle") ? (
            <p className="text-sm text-destructive">{errorFor("bookTitle")}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bookGenre">Kitap türü *</Label>
          <select
            id="bookGenre"
            name="bookGenre"
            required
            disabled={pending}
            className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
            defaultValue=""
          >
            <option value="" disabled>
              Seçin
            </option>
            {BOOK_GENRES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          {errorFor("bookGenre") ? (
            <p className="text-sm text-destructive">{errorFor("bookGenre")}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="estimatedWordCount">Tahmini kelime sayısı</Label>
          <Input
            id="estimatedWordCount"
            name="estimatedWordCount"
            inputMode="numeric"
            disabled={pending}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="manuscriptStatus">Eser durumu *</Label>
          <select
            id="manuscriptStatus"
            name="manuscriptStatus"
            required
            disabled={pending}
            className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
            defaultValue=""
          >
            <option value="" disabled>
              Seçin
            </option>
            {MANUSCRIPT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {errorFor("manuscriptStatus") ? (
            <p className="text-sm text-destructive">{errorFor("manuscriptStatus")}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="synopsis">Kısa özet *</Label>
        <Textarea
          id="synopsis"
          name="synopsis"
          required
          rows={5}
          maxLength={5000}
          disabled={pending}
          placeholder="Eserinizin konusu ve yaklaşımı…"
        />
        {errorFor("synopsis") ? (
          <p className="text-sm text-destructive">{errorFor("synopsis")}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="authorBio">Yazar biyografisi *</Label>
        <Textarea
          id="authorBio"
          name="authorBio"
          required
          rows={4}
          maxLength={3000}
          disabled={pending}
        />
        {errorFor("authorBio") ? (
          <p className="text-sm text-destructive">{errorFor("authorBio")}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="file">Dosya (PDF, DOC, DOCX · en fazla 15 MB) *</Label>
        <Input
          id="file"
          name="file"
          type="file"
          required
          disabled={pending}
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="h-11 cursor-pointer py-2"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f && f.size > MAX_FILE_BYTES) {
              setStatus({
                type: "error",
                message: "Dosya en fazla 15 MB olabilir.",
              });
              e.target.value = "";
            }
          }}
        />
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-border/70 p-4">
        <Checkbox
          id="consent"
          checked={consent}
          onCheckedChange={(v) => setConsent(v === true)}
          disabled={pending}
          className="mt-0.5"
        />
        <Label htmlFor="consent" className="text-sm leading-relaxed font-normal">
          Başvuru bilgilerimin ve dosyamın editoryal değerlendirme ve iletişim
          amacıyla işlenmesini kabul ediyorum.{" "}
          <Link href="/gizlilik" className="text-primary underline underline-offset-2">
            Gizlilik
          </Link>{" "}
          metnini okudum. *
        </Label>
      </div>
      {errorFor("consent") ? (
        <p className="text-sm text-destructive">{errorFor("consent")}</p>
      ) : null}

      <Button type="submit" disabled={pending || !consent} className="h-11 w-full sm:w-auto sm:min-w-[12rem]">
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Gönderiliyor…
          </>
        ) : (
          "Başvuruyu gönder"
        )}
      </Button>

      <div role="status" aria-live="polite" className="min-h-[1.25rem]">
        {status ? (
          <p
            className={cn(
              "text-sm",
              status.type === "success" ? "text-success" : "text-destructive",
            )}
          >
            {status.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
