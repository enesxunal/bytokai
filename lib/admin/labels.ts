import type {
  DbArticleStatus,
  DbRawArticleStatus,
} from "@/lib/database/types";

export const ARTICLE_STATUS_LABELS: Record<DbArticleStatus, string> = {
  draft: "Taslak",
  needs_review: "İnceleme",
  scheduled: "Planlandı",
  published: "Yayında",
  archived: "Arşiv",
  failed: "Başarısız",
};

export const RAW_STATUS_LABELS: Record<DbRawArticleStatus, string> = {
  pending: "Bekliyor",
  processing: "İşleniyor",
  processed: "İşlendi",
  rejected: "Reddedildi",
  failed: "Başarısız",
  skipped: "Atlandı",
};

export const JOB_STATUS_LABELS: Record<string, string> = {
  running: "Çalışıyor",
  success: "Başarılı",
  partial: "Kısmi",
  failed: "Başarısız",
  skipped: "Atlandı",
};

export const NAV_ITEMS = [
  { href: "/admin", label: "Genel Bakış", icon: "LayoutDashboard" },
  { href: "/admin/articles", label: "Haberler", icon: "Newspaper" },
  { href: "/admin/raw-articles", label: "Ham Haberler", icon: "Inbox" },
  { href: "/admin/calendar", label: "Yayın Takvimi", icon: "CalendarDays" },
  { href: "/admin/sources", label: "Kaynaklar", icon: "Rss" },
  { href: "/admin/authors", label: "Yazar Personaları", icon: "Users" },
  { href: "/admin/categories", label: "Kategoriler", icon: "FolderTree" },
  { href: "/admin/tags", label: "Etiketler", icon: "Tags" },
  { href: "/admin/automation", label: "Otomasyon", icon: "Bot" },
  { href: "/admin/ai-jobs", label: "AI İşlemleri", icon: "Sparkles" },
  {
    href: "/admin/book-submissions",
    label: "Kitap Başvuruları",
    icon: "BookOpen",
  },
  { href: "/admin/logs", label: "Sistem Logları", icon: "ScrollText" },
  { href: "/admin/settings", label: "Ayarlar", icon: "Settings" },
] as const;
