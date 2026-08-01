import { z } from "zod";

const clientSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const serverSchema = clientSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().min(1).default("gemini-3.1-flash-lite"),
  CRON_SECRET: z.string().min(1),
  APP_TIMEZONE: z.string().min(1).default("Europe/Istanbul"),
});

export type ClientEnv = z.infer<typeof clientSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;

let cachedClientEnv: ClientEnv | null = null;
let cachedServerEnv: ServerEnv | null = null;

function readProcessEnv(): Record<string, string | undefined> {
  return {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL,
    CRON_SECRET: process.env.CRON_SECRET,
    APP_TIMEZONE: process.env.APP_TIMEZONE,
  };
}

function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
    .join("; ");
}

/**
 * Soft client env for build / static generation.
 * Missing values fall back to placeholders so Next.js can compile.
 */
export function getClientEnvSoft(): ClientEnv {
  const raw = readProcessEnv();
  const parsed = clientSchema.safeParse({
    NEXT_PUBLIC_SITE_URL:
      raw.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    NEXT_PUBLIC_SUPABASE_URL:
      raw.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54321",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      raw.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "public-anon-key",
  });

  if (!parsed.success) {
    throw new Error(
      `Geçersiz client ortam değişkenleri: ${formatZodError(parsed.error)}`,
    );
  }

  return parsed.data;
}

export function getClientEnv(): ClientEnv {
  if (cachedClientEnv) {
    return cachedClientEnv;
  }

  const parsed = clientSchema.safeParse(readProcessEnv());
  if (!parsed.success) {
    throw new Error(
      `Eksik/geçersiz client ortam değişkenleri: ${formatZodError(parsed.error)}`,
    );
  }

  cachedClientEnv = parsed.data;
  return cachedClientEnv;
}

export function getServerEnv(): ServerEnv {
  if (cachedServerEnv) {
    return cachedServerEnv;
  }

  const parsed = serverSchema.safeParse(readProcessEnv());
  if (!parsed.success) {
    throw new Error(
      `Eksik/geçersiz server ortam değişkenleri: ${formatZodError(parsed.error)}`,
    );
  }

  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}

export const env = {
  get siteUrl(): string {
    return getClientEnv().NEXT_PUBLIC_SITE_URL;
  },
  get supabaseUrl(): string {
    return getClientEnv().NEXT_PUBLIC_SUPABASE_URL;
  },
  get supabaseAnonKey(): string {
    return getClientEnv().NEXT_PUBLIC_SUPABASE_ANON_KEY;
  },
  get supabaseServiceRoleKey(): string {
    return getServerEnv().SUPABASE_SERVICE_ROLE_KEY;
  },
  get geminiApiKey(): string {
    return getServerEnv().GEMINI_API_KEY;
  },
  get geminiModel(): string {
    return getServerEnv().GEMINI_MODEL;
  },
  get cronSecret(): string {
    return getServerEnv().CRON_SECRET;
  },
  get appTimezone(): string {
    return getServerEnv().APP_TIMEZONE;
  },
};
