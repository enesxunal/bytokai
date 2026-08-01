import { z } from "zod";

export const BOOK_GENRES = [
  "Roman",
  "Öykü",
  "Şiir",
  "Deneme",
  "Araştırma",
  "Akademik",
  "Çocuk",
  "Gençlik",
  "Teknoloji",
  "İş Dünyası",
  "Kişisel Gelişim",
  "Diğer",
] as const;

export const MANUSCRIPT_STATUSES = [
  "Tamamlandı",
  "İlk taslak",
  "Düzenleme aşamasında",
  "Fikir/proje aşamasında",
] as const;

export const BOOK_SUBMISSION_STATUSES = [
  "new",
  "reviewing",
  "contacted",
  "accepted",
  "rejected",
  "archived",
] as const;

export type BookGenre = (typeof BOOK_GENRES)[number];
export type ManuscriptStatus = (typeof MANUSCRIPT_STATUSES)[number];
export type BookSubmissionStatus = (typeof BOOK_SUBMISSION_STATUSES)[number];

export const MAX_FILE_BYTES = 15 * 1024 * 1024;

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"] as const;

export const BOOK_SUBMISSION_STATUS_LABELS: Record<
  BookSubmissionStatus,
  string
> = {
  new: "Yeni",
  reviewing: "İnceleniyor",
  contacted: "İletişime geçildi",
  accepted: "Kabul",
  rejected: "Red",
  archived: "Arşiv",
};

function stripControlChars(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

export function sanitizePlainText(value: string): string {
  return stripControlChars(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizeMultiline(value: string): string {
  return stripControlChars(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const bookSubmissionFieldsSchema = z.object({
  fullName: z
    .string()
    .transform(sanitizePlainText)
    .pipe(z.string().min(2, "Ad soyad en az 2 karakter olmalı").max(120)),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Geçerli bir e-posta girin")
    .max(254),
  phone: z
    .string()
    .transform(sanitizePlainText)
    .pipe(z.string().max(40))
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  bookTitle: z
    .string()
    .transform(sanitizePlainText)
    .pipe(z.string().min(2, "Kitap adı zorunlu").max(200)),
  bookGenre: z.enum(BOOK_GENRES, { message: "Kitap türü seçin" }),
  estimatedWordCount: z
    .string()
    .optional()
    .transform((v) => {
      if (!v || !v.trim()) return null;
      const n = Number(v.replace(/\D/g, ""));
      return Number.isFinite(n) ? n : null;
    })
    .pipe(
      z
        .number()
        .int()
        .min(0)
        .max(5_000_000)
        .nullable(),
    ),
  manuscriptStatus: z.enum(MANUSCRIPT_STATUSES, {
    message: "Eser durumu seçin",
  }),
  synopsis: z
    .string()
    .transform(sanitizeMultiline)
    .pipe(
      z
        .string()
        .min(50, "Kısa özet en az 50 karakter olmalı")
        .max(5000, "Kısa özet en fazla 5000 karakter olabilir"),
    ),
  authorBio: z
    .string()
    .transform(sanitizeMultiline)
    .pipe(
      z
        .string()
        .min(30, "Yazar biyografisi en az 30 karakter olmalı")
        .max(3000, "Yazar biyografisi en fazla 3000 karakter olabilir"),
    ),
  consent: z
    .union([z.literal("on"), z.literal("true"), z.literal(true), z.literal("1")])
    .transform(() => true),
  /** Honeypot — must stay empty */
  website: z
    .string()
    .optional()
    .transform((v) => v ?? "")
    .refine((v) => v === "", { message: "Geçersiz gönderim" }),
});

export type BookSubmissionFields = z.infer<typeof bookSubmissionFieldsSchema>;

export function extensionOf(filename: string): string {
  const idx = filename.lastIndexOf(".");
  if (idx < 0) return "";
  return filename.slice(idx).toLowerCase();
}

export function isAllowedUpload(file: {
  name: string;
  type: string;
  size: number;
}): { ok: true } | { ok: false; message: string } {
  if (!file || file.size <= 0) {
    return { ok: false, message: "Dosya zorunludur." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, message: "Dosya en fazla 15 MB olabilir." };
  }
  const ext = extensionOf(file.name);
  if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) {
    return {
      ok: false,
      message: "Yalnızca PDF, DOC veya DOCX dosyaları kabul edilir.",
    };
  }
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
    // Some browsers send empty MIME for docx — allow if extension is valid and type empty
    if (file.type && file.type !== "application/octet-stream") {
      return {
        ok: false,
        message: "Dosya türü desteklenmiyor.",
      };
    }
  }
  return { ok: true };
}

export function resolveMimeType(file: { name: string; type: string }): string {
  if ((ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
    return file.type;
  }
  const ext = extensionOf(file.name);
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".doc") return "application/msword";
  return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}
