import { z } from "zod";

export const TIME_HHMM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const MAX_PROCESS_BATCH_LIMIT = 20;

export const DEFAULT_AUTOMATION_SETTINGS = {
  automation_enabled: true,
  ingestion_enabled: true,
  publishing_enabled: true,
  daily_min_articles: 5,
  daily_max_articles: 12,
  publish_window_start: "08:00",
  publish_window_end: "23:00",
  min_publish_interval_minutes: 45,
  max_per_hour: 2,
  max_process_batch: 5,
  min_ai_confidence: 0.65,
} as const;

export type AutomationSettings = {
  automation_enabled: boolean;
  ingestion_enabled: boolean;
  publishing_enabled: boolean;
  daily_min_articles: number;
  daily_max_articles: number;
  publish_window_start: string;
  publish_window_end: string;
  min_publish_interval_minutes: number;
  max_per_hour: number;
  max_process_batch: number;
  min_ai_confidence: number;
};

export const AUTOMATION_SETTING_KEYS = [
  "automation_enabled",
  "ingestion_enabled",
  "publishing_enabled",
  "daily_min_articles",
  "daily_max_articles",
  "publish_window_start",
  "publish_window_end",
  "min_publish_interval_minutes",
  "max_per_hour",
  "max_process_batch",
  "min_ai_confidence",
] as const satisfies ReadonlyArray<keyof AutomationSettings>;

export type AutomationSettingKey = (typeof AUTOMATION_SETTING_KEYS)[number];

export const automationSettingsSchema = z
  .object({
    automation_enabled: z.boolean({
      message: "Otomasyon durumu geçersiz",
    }),
    ingestion_enabled: z.boolean({
      message: "Kaynak tarama durumu geçersiz",
    }),
    publishing_enabled: z.boolean({
      message: "Yayın durumu geçersiz",
    }),
    daily_min_articles: z
      .number({ message: "Günlük minimum haber sayı olmalı" })
      .int("Günlük minimum haber tam sayı olmalı")
      .min(0, "Günlük minimum haber en az 0 olmalı")
      .max(100, "Günlük minimum haber en fazla 100 olabilir"),
    daily_max_articles: z
      .number({ message: "Günlük maksimum haber sayı olmalı" })
      .int("Günlük maksimum haber tam sayı olmalı")
      .min(1, "Günlük maksimum haber en az 1 olmalı")
      .max(100, "Günlük maksimum haber en fazla 100 olabilir"),
    publish_window_start: z
      .string()
      .trim()
      .regex(TIME_HHMM_REGEX, "Yayın başlangıç saati SS:DD formatında olmalı"),
    publish_window_end: z
      .string()
      .trim()
      .regex(TIME_HHMM_REGEX, "Yayın bitiş saati SS:DD formatında olmalı"),
    min_publish_interval_minutes: z
      .number({ message: "Minimum yayın aralığı sayı olmalı" })
      .int("Minimum yayın aralığı tam sayı olmalı")
      .min(5, "Minimum yayın aralığı en az 5 dakika olmalı")
      .max(24 * 60, "Minimum yayın aralığı en fazla 1440 dakika olabilir"),
    max_per_hour: z
      .number({ message: "Saatlik maksimum haber sayı olmalı" })
      .int("Saatlik maksimum haber tam sayı olmalı")
      .min(1, "Saatlik maksimum haber en az 1 olmalı")
      .max(60, "Saatlik maksimum haber en fazla 60 olabilir"),
    max_process_batch: z
      .number({ message: "Maksimum batch sayı olmalı" })
      .int("Maksimum batch tam sayı olmalı")
      .min(1, "Maksimum batch en az 1 olmalı")
      .max(
        MAX_PROCESS_BATCH_LIMIT,
        `Maksimum batch en fazla ${MAX_PROCESS_BATCH_LIMIT} olabilir`,
      ),
    min_ai_confidence: z
      .number({ message: "AI güven skoru sayı olmalı" })
      .min(0, "AI güven skoru en az 0 olmalı")
      .max(1, "AI güven skoru en fazla 1 olabilir"),
  })
  .superRefine((value, ctx) => {
    if (value.daily_min_articles > value.daily_max_articles) {
      ctx.addIssue({
        code: "custom",
        path: ["daily_min_articles"],
        message: "Günlük minimum, günlük maksimumdan büyük olamaz",
      });
    }
    if (value.publish_window_start > value.publish_window_end) {
      ctx.addIssue({
        code: "custom",
        path: ["publish_window_start"],
        message: "Yayın başlangıç saati bitiş saatinden sonra olamaz",
      });
    }
  });

export type AutomationSettingsInput = z.infer<typeof automationSettingsSchema>;

export type ManualJobKind = "ingest" | "process" | "publish" | "maintenance";

export const MANUAL_JOB_LABELS: Record<ManualJobKind, string> = {
  ingest: "Kaynakları Tara",
  process: "Kuyruğu İşle",
  publish: "Zamanı Gelenleri Yayınla",
  maintenance: "Bakım Görevini Çalıştır",
};

export const MANUAL_JOB_TYPES: Record<ManualJobKind, string> = {
  ingest: "ingest",
  process: "process",
  publish: "publish",
  maintenance: "maintenance",
};

export const MANUAL_JOB_KIND_SCHEMA = z.enum([
  "ingest",
  "process",
  "publish",
  "maintenance",
]);

export function settingsEqual(
  a: AutomationSettings,
  b: AutomationSettings,
): boolean {
  return AUTOMATION_SETTING_KEYS.every((key) => a[key] === b[key]);
}

export function sanitizeErrorSummary(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return "İşlem tamamlanamadı";
  if (/secret|api[_-]?key|token|authorization|bearer/i.test(trimmed)) {
    return "İşlem tamamlanamadı";
  }
  if (trimmed.length > 160) {
    return `${trimmed.slice(0, 157)}…`;
  }
  return trimmed;
}

export function toSettingJsonValue(
  value: AutomationSettings[AutomationSettingKey],
): boolean | number | string {
  return value;
}

export type ManualJobReadiness = {
  job: ManualJobKind;
  label: string;
  ready: boolean;
  reason: string | null;
};

export type AutomationJobSummary = {
  kind: "ingestion" | ManualJobKind;
  label: string;
  id: string | null;
  status: "running" | "success" | "partial" | "failed" | null;
  started_at: string | null;
  finished_at: string | null;
  processed: number | null;
  success: number | null;
  failed: number | null;
  error_summary: string | null;
};

export type AutomationPageData = {
  connected: boolean;
  settingsKnown: boolean;
  settings: AutomationSettings;
  settingsUpdatedAt: string | null;
  readiness: {
    supabaseConfigured: boolean;
    geminiConfigured: boolean;
    cronSecretConfigured: boolean;
    activeSources: number | null;
    scheduledArticles: number | null;
    pendingRawArticles: number | null;
  };
  manualJobs: ManualJobReadiness[];
  recentRuns: AutomationJobSummary[];
};
