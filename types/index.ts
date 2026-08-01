export type ProfileRole = "admin" | "editor";

export type IngestionType = "rss" | "html" | "manual";

export type RawArticleStatus =
  | "pending"
  | "processing"
  | "processed"
  | "rejected"
  | "failed"
  | "skipped";

export type ArticleStatus =
  | "draft"
  | "needs_review"
  | "scheduled"
  | "published"
  | "archived"
  | "failed";

export type PublishingSlotStatus =
  | "open"
  | "reserved"
  | "published"
  | "cancelled";

export type RunStatus = "running" | "success" | "partial" | "failed";

export type AiGenerationStatus = "pending" | "success" | "failed";

export type NewsletterStatus = "active" | "unsubscribed" | "bounced";

export type JobType = "ingest" | "process" | "publish" | "maintenance";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: ProfileRole;
  created_at: string;
  updated_at: string;
}

export interface Author {
  id: string;
  name: string;
  slug: string;
  role: string;
  short_bio: string;
  full_bio: string;
  expertise: string[];
  tone: string;
  writing_rules: string;
  system_prompt: string;
  avatar_seed: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Source {
  id: string;
  name: string;
  slug: string;
  homepage_url: string;
  section_url: string;
  feed_url: string | null;
  ingestion_type: IngestionType;
  enabled: boolean;
  priority: number;
  default_language: string;
  last_checked_at: string | null;
  last_success_at: string | null;
  last_error_at: string | null;
  consecutive_failures: number;
  is_unhealthy: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  theme: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface RawArticle {
  id: string;
  source_id: string;
  external_id: string | null;
  original_url: string;
  canonical_url: string;
  original_title: string;
  original_excerpt: string | null;
  original_author: string | null;
  original_published_at: string | null;
  original_image_url: string | null;
  raw_content: string | null;
  raw_payload: Record<string, unknown>;
  content_hash: string | null;
  status: RawArticleStatus;
  discovered_at: string;
  processed_at: string | null;
  failure_count: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface Article {
  id: string;
  raw_article_id: string | null;
  author_id: string | null;
  category_id: string | null;
  title: string;
  slug: string;
  excerpt: string;
  content_markdown: string;
  content_html: string;
  cover_image_url: string | null;
  source_name: string | null;
  source_url: string | null;
  source_published_at: string | null;
  status: ArticleStatus;
  featured: boolean;
  breaking: boolean;
  ai_generated: boolean;
  ai_model: string | null;
  ai_confidence_score: number | null;
  risk_flags: string[];
  seo_title: string | null;
  seo_description: string | null;
  reading_time_minutes: number;
  scheduled_at: string | null;
  published_at: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface ArticleWithRelations extends Article {
  author: Author | null;
  category: Category | null;
  source: Source | null;
  tags: Tag[];
  raw_article: RawArticle | null;
}

export interface ArticleTag {
  article_id: string;
  tag_id: string;
}

export interface PublishingSlot {
  id: string;
  scheduled_at: string;
  article_id: string | null;
  status: PublishingSlotStatus;
  created_at: string;
  updated_at: string;
}

export interface IngestionRun {
  id: string;
  source_id: string | null;
  started_at: string;
  finished_at: string | null;
  status: RunStatus;
  discovered_count: number;
  inserted_count: number;
  duplicate_count: number;
  error_message: string | null;
  metadata: Record<string, unknown>;
}

export interface JobRun {
  id: string;
  job_type: string;
  started_at: string;
  finished_at: string | null;
  status: RunStatus;
  processed_count: number;
  success_count: number;
  failure_count: number;
  error_message: string | null;
  metadata: Record<string, unknown>;
}

export interface AiGeneration {
  id: string;
  raw_article_id: string | null;
  article_id: string | null;
  model: string;
  prompt_version: string;
  request_metadata: Record<string, unknown>;
  response_metadata: Record<string, unknown>;
  status: AiGenerationStatus;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface SiteSettings {
  site_name: string;
  site_tagline: string;
  site_description: string;
  site_url: string;
  default_locale: string;
  timezone: string;
  default_og_image_url: string | null;
  posts_per_page: number;
  enable_newsletter: boolean;
  automation_enabled: boolean;
  ingestion_enabled: boolean;
  publishing_enabled: boolean;
  daily_min_articles: number;
  daily_max_articles: number;
  publish_window_start: string;
  publish_window_end: string;
  min_gap_minutes: number;
  max_per_hour: number;
  process_batch_size: number;
  min_ai_confidence: number;
  max_generation_attempts: number;
  social: {
    twitter?: string;
    instagram?: string;
    youtube?: string;
    linkedin?: string;
  };
  seo: {
    default_title_template: string;
    default_description: string;
    twitter_card: "summary" | "summary_large_image";
  };
  ai_disclosure: string;
  contact_email: string | null;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  status: NewsletterStatus;
  created_at: string;
  unsubscribed_at: string | null;
}

export interface SystemLock {
  lock_key: string;
  locked_by: string;
  locked_at: string;
  expires_at: string;
}

export interface NormalizedSourceItem {
  sourceId: string;
  externalId?: string;
  title: string;
  url: string;
  canonicalUrl: string;
  excerpt?: string;
  publishedAt?: string;
  authorName?: string;
  imageUrl?: string;
  rawContent?: string;
  categories?: string[];
}

export interface AuthorSelectionScores {
  technicalDepth: number;
  businessFocus: number;
  researchFocus: number;
  criticalFocus: number;
  trendFocus: number;
}

export interface PublishWindow {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  timezone: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiFailure {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export interface DashboardStats {
  discoveredToday: number;
  generatedToday: number;
  publishedToday: number;
  scheduledCount: number;
  failedCount: number;
  activeSources: number;
  lastSuccessfulCron: string | null;
  aiSuccessRate: number;
}

export interface ChartPoint {
  date: string;
  count: number;
}
