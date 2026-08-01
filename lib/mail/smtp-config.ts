import { z } from "zod";

const smtpSchema = z.object({
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((v) => {
      if (v == null || v === "") return false;
      return ["1", "true", "yes", "on"].includes(v.toLowerCase());
    }),
  SMTP_USER: z.string().min(1),
  SMTP_PASSWORD: z.string().min(1),
  MAIL_FROM: z.string().min(1),
  BOOK_SUBMISSION_TO: z.string().email(),
});

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  mailFrom: string;
  bookSubmissionTo: string;
};

export function getSmtpConfig(): SmtpConfig | null {
  const parsed = smtpSchema.safeParse({
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_SECURE: process.env.SMTP_SECURE,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,
    MAIL_FROM: process.env.MAIL_FROM,
    BOOK_SUBMISSION_TO: process.env.BOOK_SUBMISSION_TO,
  });

  if (!parsed.success) {
    return null;
  }

  const d = parsed.data;
  return {
    host: d.SMTP_HOST,
    port: d.SMTP_PORT,
    secure: d.SMTP_SECURE,
    user: d.SMTP_USER,
    password: d.SMTP_PASSWORD,
    mailFrom: d.MAIL_FROM,
    bookSubmissionTo: d.BOOK_SUBMISSION_TO,
  };
}

export function maskSmtpUser(user: string): string {
  const at = user.indexOf("@");
  if (at <= 1) return "***";
  return `${user.slice(0, 1)}***${user.slice(at)}`;
}
