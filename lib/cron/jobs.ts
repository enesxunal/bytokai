import "server-only";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getGeminiModel } from "@/lib/ai/client";
import { classifyArticle } from "@/lib/ai/classify-article";
import { generateArticle } from "@/lib/ai/generate-article";
import { qualityCheck } from "@/lib/ai/quality-check";
import { selectAuthorPersona } from "@/lib/ai/select-author";
import type { AutomationSettings } from "@/lib/admin/automation-settings";
import { MAX_PROCESS_BATCH_LIMIT } from "@/lib/admin/automation-settings";
import {
  isDuplicateByTitle,
  isDuplicateByUrl,
} from "@/lib/ingestion/dedupe";
import { contentHash } from "@/lib/utils/hash";
import { markdownToSafeHtml } from "@/lib/utils/markdown";
import { calculateReadingTime } from "@/lib/utils/reading-time";
import { generateUniqueSlug, slugifyTurkish } from "@/lib/utils/slug";
import { createLogger } from "@/lib/utils/logger";
import { SourceFetchError } from "@/lib/utils/errors";
import {
  DEFAULT_FETCH_TIMEOUT_MS,
} from "@/lib/sources/types";
import {
  fetchRssNormalizedItems,
  fetchWithHtmlFallback,
} from "@/lib/sources/base";
import {
  selectNextSlot,
  DEFAULT_MIN_GAP_MINUTES,
  DEFAULT_MAX_PER_HOUR,
} from "@/lib/publishing/scheduler";
import type { Author, NormalizedSourceItem } from "@/types";

const logger = createLogger("cron.jobs");

export const MAX_SOURCES_PER_INGEST = 8;
export const MAX_ITEMS_PER_SOURCE = 20;
export const MAX_PUBLISH_BATCH = 10;
export const MAX_RAW_FAILURES = 5;
export const LOG_RETENTION_DAYS = 30;
export const STALE_PROCESSING_HOURS = 2;
export const UNHEALTHY_FAILURE_THRESHOLD = 3;

export type JobHandlerContext = {
  supabase: SupabaseClient;
  settings: AutomationSettings;
  trigger: string;
  actorId: string | null;
  runId: string;
};

export type JobHandlerResult = {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  message: string;
  skippedOnly?: boolean;
  metadata?: Record<string, unknown>;
};

type DbSource = {
  id: string;
  name: string;
  slug: string;
  homepage_url: string;
  section_url: string;
  feed_url: string | null;
  ingestion_type: "rss" | "html" | "manual";
  enabled: boolean;
  priority: number;
  consecutive_failures: number;
};

type DbRawArticle = {
  id: string;
  source_id: string;
  original_url: string;
  canonical_url: string;
  original_title: string;
  original_excerpt: string | null;
  original_author: string | null;
  original_published_at: string | null;
  original_image_url: string | null;
  raw_content: string | null;
  content_hash: string | null;
  status: string;
  failure_count: number;
};

function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof SourceFetchError) {
    return "Kaynak feed veya sayfasına erişilemedi";
  }
  if (error instanceof Error) {
    const msg = error.message;
    if (/secret|api[_-]?key|token|authorization|bearer/i.test(msg)) {
      return "İşlem tamamlanamadı";
    }
    return msg.length > 180 ? `${msg.slice(0, 177)}…` : msg;
  }
  return "İşlem tamamlanamadı";
}

function itemContentHash(item: NormalizedSourceItem): string {
  return contentHash(
    item.rawContent ?? item.excerpt ?? item.title,
  );
}

async function loadRecentCanonicals(
  supabase: SupabaseClient,
  sourceId: string,
): Promise<{ urls: string[]; titles: string[]; hashes: Set<string> }> {
  const { data } = await supabase
    .from("raw_articles")
    .select("canonical_url, original_title, content_hash")
    .eq("source_id", sourceId)
    .order("discovered_at", { ascending: false })
    .limit(200);

  const urls: string[] = [];
  const titles: string[] = [];
  const hashes = new Set<string>();
  for (const row of data ?? []) {
    if (row.canonical_url) urls.push(row.canonical_url as string);
    if (row.original_title) titles.push(row.original_title as string);
    if (row.content_hash) hashes.add(row.content_hash as string);
  }
  return { urls, titles, hashes };
}

async function insertRawItem(
  supabase: SupabaseClient,
  source: DbSource,
  item: NormalizedSourceItem,
): Promise<"inserted" | "duplicate" | "failed"> {
  const hash = itemContentHash(item);
  const { error } = await supabase.from("raw_articles").insert({
    source_id: source.id,
    external_id: item.externalId ?? item.canonicalUrl,
    original_url: item.url,
    canonical_url: item.canonicalUrl,
    original_title: item.title,
    original_excerpt: item.excerpt ?? null,
    original_author: item.authorName ?? null,
    original_published_at: item.publishedAt ?? null,
    original_image_url: item.imageUrl ?? null,
    raw_content: item.rawContent ?? item.excerpt ?? null,
    content_hash: hash,
    status: "pending",
    raw_payload: {
      categories: item.categories ?? [],
    },
  });

  if (!error) return "inserted";

  const code = (error as { code?: string }).code;
  if (
    code === "23505" ||
    /duplicate|unique/i.test(error.message)
  ) {
    return "duplicate";
  }

  logger.warn("raw_articles insert başarısız", {
    sourceId: source.id,
    reason: error.message,
  });
  return "failed";
}

async function ingestOneSource(
  supabase: SupabaseClient,
  source: DbSource,
): Promise<{
  discovered: number;
  inserted: number;
  duplicates: number;
  status: "success" | "failed";
  error: string | null;
}> {
  const { data: runRow } = await supabase
    .from("ingestion_runs")
    .insert({
      source_id: source.id,
      status: "running",
      metadata: { trigger: "cron_ingest" },
    })
    .select("id")
    .maybeSingle();

  const runId = (runRow?.id as string | undefined) ?? null;
  const checkedAt = new Date().toISOString();
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    DEFAULT_FETCH_TIMEOUT_MS,
  );

  let discovered = 0;
  let inserted = 0;
  let duplicates = 0;
  let status: "success" | "failed" = "success";
  let errorMessage: string | null = null;

  try {
    if (source.ingestion_type === "manual") {
      discovered = 0;
    } else {
      let items: NormalizedSourceItem[] = [];
      if (source.ingestion_type === "rss") {
        if (!source.feed_url) {
          throw new SourceFetchError("RSS kaynağı için feed URL gerekli");
        }
        items = await fetchRssNormalizedItems({
          feedUrl: source.feed_url,
          sourceId: source.id,
          maxItems: MAX_ITEMS_PER_SOURCE,
          signal: controller.signal,
        });
      } else {
        items = await fetchWithHtmlFallback({
          feedUrl: source.feed_url,
          listingUrl: source.section_url,
          sourceId: source.id,
          maxItems: MAX_ITEMS_PER_SOURCE,
          signal: controller.signal,
        });
      }

      discovered = items.length;
      const existing = await loadRecentCanonicals(supabase, source.id);

      for (const item of items) {
        const hash = itemContentHash(item);
        if (
          isDuplicateByUrl(item.canonicalUrl, existing.urls) ||
          existing.hashes.has(hash) ||
          isDuplicateByTitle(item.title, existing.titles)
        ) {
          duplicates += 1;
          continue;
        }

        const result = await insertRawItem(supabase, source, item);
        if (result === "inserted") {
          inserted += 1;
          existing.urls.push(item.canonicalUrl);
          existing.titles.push(item.title);
          existing.hashes.add(hash);
        } else if (result === "duplicate") {
          duplicates += 1;
        }
      }
    }

    await supabase
      .from("sources")
      .update({
        last_checked_at: checkedAt,
        last_success_at: checkedAt,
        consecutive_failures: 0,
        is_unhealthy: false,
      })
      .eq("id", source.id);
  } catch (error) {
    status = "failed";
    errorMessage = safeErrorMessage(error);
    const failures = source.consecutive_failures + 1;
    await supabase
      .from("sources")
      .update({
        last_checked_at: checkedAt,
        last_error_at: checkedAt,
        consecutive_failures: failures,
        is_unhealthy: failures >= UNHEALTHY_FAILURE_THRESHOLD,
      })
      .eq("id", source.id);
    logger.warn("Kaynak ingest başarısız", {
      sourceId: source.id,
      reason: error instanceof Error ? error.message : String(error),
    });
  } finally {
    clearTimeout(timeout);
  }

  if (runId) {
    await supabase
      .from("ingestion_runs")
      .update({
        status,
        finished_at: new Date().toISOString(),
        discovered_count: discovered,
        inserted_count: inserted,
        duplicate_count: duplicates,
        error_message: errorMessage,
      })
      .eq("id", runId);
  }

  return {
    discovered,
    inserted,
    duplicates,
    status,
    error: errorMessage,
  };
}

export async function runIngestJob(
  ctx: JobHandlerContext,
): Promise<JobHandlerResult> {
  const { data: sources, error } = await ctx.supabase
    .from("sources")
    .select(
      "id, name, slug, homepage_url, section_url, feed_url, ingestion_type, enabled, priority, consecutive_failures",
    )
    .eq("enabled", true)
    .order("priority", { ascending: true })
    .limit(MAX_SOURCES_PER_INGEST);

  if (error) {
    logger.error("Aktif kaynaklar okunamadı", { reason: error.message });
    return {
      processed: 0,
      succeeded: 0,
      failed: 1,
      skipped: 0,
      message: "Kaynak listesi alınamadı",
    };
  }

  const list = (sources ?? []) as DbSource[];
  if (list.length === 0) {
    return {
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      message: "Aktif kaynak yok",
    };
  }

  let succeeded = 0;
  let failed = 0;
  let insertedTotal = 0;

  for (const source of list) {
    const result = await ingestOneSource(ctx.supabase, source);
    if (result.status === "success") {
      succeeded += 1;
      insertedTotal += result.inserted;
    } else {
      failed += 1;
    }
  }

  return {
    processed: list.length,
    succeeded,
    failed,
    skipped: 0,
    message:
      failed === 0
        ? `${succeeded} kaynak tarandı, ${insertedTotal} yeni kayıt`
        : `${succeeded} başarılı, ${failed} kaynak hatası`,
    metadata: { inserted: insertedTotal },
  };
}

async function ensureTags(
  supabase: SupabaseClient,
  tagNames: string[],
): Promise<string[]> {
  const ids: string[] = [];
  for (const name of tagNames.slice(0, 12)) {
    const cleaned = name.trim();
    if (!cleaned) continue;
    const slug = slugifyTurkish(cleaned).slice(0, 80) || "etiket";

    const { data: existing } = await supabase
      .from("tags")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existing?.id) {
      ids.push(existing.id as string);
      continue;
    }

    const { data: created, error } = await supabase
      .from("tags")
      .insert({ name: cleaned.slice(0, 80), slug })
      .select("id")
      .maybeSingle();

    if (error || !created) {
      const { data: raced } = await supabase
        .from("tags")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (raced?.id) ids.push(raced.id as string);
      continue;
    }
    ids.push(created.id as string);
  }
  return ids;
}

async function processOneRaw(
  ctx: JobHandlerContext,
  raw: DbRawArticle,
  authors: Author[],
  categories: Array<{ id: string; slug: string; name: string; active: boolean }>,
  recentAuthorIds: string[],
): Promise<"success" | "failed" | "rejected" | "skipped"> {
  const sourceRes = await ctx.supabase
    .from("sources")
    .select("name")
    .eq("id", raw.source_id)
    .maybeSingle();
  const sourceName = (sourceRes.data?.name as string | undefined) ?? "Kaynak";

  try {
    const categorySlugs = categories
      .filter((c) => c.active)
      .map((c) => c.slug);

    const classification = await classifyArticle({
      title: raw.original_title,
      excerpt: raw.original_excerpt,
      limitedContent: raw.raw_content,
      sourceName,
      url: raw.original_url,
      categorySlugs,
    });

    if (!classification.suitable) {
      await ctx.supabase
        .from("raw_articles")
        .update({
          status: "rejected",
          processed_at: new Date().toISOString(),
          last_error: classification.reason.slice(0, 400),
        })
        .eq("id", raw.id);
      return "rejected";
    }

    const persona = selectAuthorPersona(
      {
        technicalDepth: classification.technicalDepth,
        businessFocus: classification.businessFocus,
        researchFocus: classification.researchFocus,
        criticalFocus: classification.criticalFocus,
      },
      authors.map((a) => ({
        id: a.id,
        slug: a.slug,
        name: a.name,
        active: a.active,
        expertise: a.expertise,
      })),
      recentAuthorIds,
    );

    if (!persona) {
      throw new Error("Uygun yazar personası bulunamadı");
    }

    const author = authors.find((a) => a.id === persona.id);
    if (!author) {
      throw new Error("Yazar kaydı bulunamadı");
    }

    const generated = await generateArticle({
      author,
      sourcePackage: {
        sourceName,
        originalUrl: raw.original_url,
        originalTitle: raw.original_title,
        originalExcerpt: raw.original_excerpt,
        limitedContent: raw.raw_content,
        publishedAt: raw.original_published_at,
        authorName: raw.original_author,
        selectedAuthorSlug: author.slug,
        categorySlugs,
        personaSummaries: authors.map((a) => ({
          slug: a.slug,
          name: a.name,
          role: a.role,
          expertise: a.expertise,
        })),
      },
    });

    const quality = qualityCheck(
      generated.article,
      ctx.settings.min_ai_confidence,
    );

    if (!quality.pass && !quality.needsReview) {
      await ctx.supabase
        .from("raw_articles")
        .update({
          status: "failed",
          processed_at: new Date().toISOString(),
          failure_count: raw.failure_count + 1,
          last_error: quality.reasons.join("; ").slice(0, 400),
        })
        .eq("id", raw.id);
      return "failed";
    }

    const category =
      categories.find((c) => c.slug === generated.article.categorySlug) ??
      categories.find((c) => c.slug === classification.categoryHint) ??
      categories.find((c) => c.active) ??
      null;

    const slug = await generateUniqueSlug(
      generated.article.slugSuggestion || generated.article.title,
      async (candidate) => {
        const { data } = await ctx.supabase
          .from("articles")
          .select("id")
          .eq("slug", candidate)
          .maybeSingle();
        return Boolean(data);
      },
    );

    const contentHtml = markdownToSafeHtml(generated.article.contentMarkdown);
    const readingTime = calculateReadingTime(generated.article.contentMarkdown);

    let articleStatus: "scheduled" | "needs_review" = "scheduled";
    let scheduledAt: string | null = null;

    if (quality.needsReview || !quality.pass) {
      articleStatus = "needs_review";
    } else {
      const { data: scheduledRows } = await ctx.supabase
        .from("articles")
        .select("scheduled_at")
        .eq("status", "scheduled")
        .not("scheduled_at", "is", null);

      const existingSlots = (scheduledRows ?? [])
        .map((row) => row.scheduled_at as string)
        .filter(Boolean)
        .map((value) => new Date(value));

      const slot = selectNextSlot(existingSlots, {
        minGapMinutes:
          ctx.settings.min_publish_interval_minutes || DEFAULT_MIN_GAP_MINUTES,
        maxPerHour: ctx.settings.max_per_hour || DEFAULT_MAX_PER_HOUR,
        windowStart: ctx.settings.publish_window_start,
        windowEnd: ctx.settings.publish_window_end,
        priority: generated.article.suggestedPublishPriority,
      });

      if (!slot) {
        articleStatus = "needs_review";
      } else {
        scheduledAt = slot.toISOString();
      }
    }

    const { data: article, error: articleError } = await ctx.supabase
      .from("articles")
      .insert({
        raw_article_id: raw.id,
        author_id: author.id,
        category_id: category?.id ?? null,
        title: generated.article.title,
        slug,
        excerpt: generated.article.excerpt,
        content_markdown: generated.article.contentMarkdown,
        content_html: contentHtml,
        cover_image_url: raw.original_image_url,
        source_name: sourceName,
        source_url: raw.original_url,
        source_published_at: raw.original_published_at,
        status: articleStatus,
        ai_generated: true,
        ai_model: generated.model,
        ai_confidence_score: generated.article.confidenceScore,
        risk_flags: generated.article.riskFlags,
        seo_title: generated.article.seoTitle,
        seo_description: generated.article.seoDescription,
        reading_time_minutes: readingTime,
        scheduled_at: scheduledAt,
      })
      .select("id")
      .maybeSingle();

    if (articleError || !article) {
      if ((articleError as { code?: string } | null)?.code === "23505") {
        await ctx.supabase
          .from("raw_articles")
          .update({
            status: "processed",
            processed_at: new Date().toISOString(),
            last_error: null,
          })
          .eq("id", raw.id);
        return "skipped";
      }
      throw new Error(articleError?.message ?? "Article insert failed");
    }

    const tagIds = await ensureTags(ctx.supabase, generated.article.tags);
    if (tagIds.length > 0) {
      await ctx.supabase.from("article_tags").upsert(
        tagIds.map((tagId) => ({
          article_id: article.id,
          tag_id: tagId,
        })),
        { onConflict: "article_id,tag_id", ignoreDuplicates: true },
      );
    }

    if (scheduledAt) {
      await ctx.supabase.from("publishing_slots").insert({
        scheduled_at: scheduledAt,
        article_id: article.id,
        status: "reserved",
      });
    }

    await ctx.supabase.from("ai_generations").insert({
      raw_article_id: raw.id,
      article_id: article.id,
      model: generated.model,
      prompt_version: generated.promptVersion,
      status: "success",
      duration_ms: generated.latencyMs,
      request_metadata: { trigger: "cron_process" },
      response_metadata: {
        confidence: generated.article.confidenceScore,
        risk_flags: generated.article.riskFlags,
      },
    });

    await ctx.supabase
      .from("raw_articles")
      .update({
        status: "processed",
        processed_at: new Date().toISOString(),
        last_error: null,
      })
      .eq("id", raw.id);

    recentAuthorIds.push(author.id);
    return "success";
  } catch (error) {
    const message = safeErrorMessage(error);
    logger.warn("Ham haber işleme başarısız", {
      rawId: raw.id,
      reason: error instanceof Error ? error.message : String(error),
    });

    await ctx.supabase
      .from("raw_articles")
      .update({
        status: "failed",
        processed_at: new Date().toISOString(),
        failure_count: raw.failure_count + 1,
        last_error: message.slice(0, 400),
      })
      .eq("id", raw.id);

    await ctx.supabase.from("ai_generations").insert({
      raw_article_id: raw.id,
      model: getGeminiModel(),
      prompt_version: "v1",
      status: "failed",
      error_message: message.slice(0, 400),
      request_metadata: { trigger: "cron_process" },
      response_metadata: {},
    });

    return "failed";
  }
}

export async function runProcessJob(
  ctx: JobHandlerContext,
): Promise<JobHandlerResult> {
  if (!isGeminiConfigured()) {
    return {
      processed: 0,
      succeeded: 0,
      failed: 1,
      skipped: 0,
      message: "Gemini yapılandırması eksik",
    };
  }

  const batch = Math.min(
    Math.max(1, ctx.settings.max_process_batch || 5),
    MAX_PROCESS_BATCH_LIMIT,
  );

  const { data: claimed, error: claimError } = await ctx.supabase.rpc(
    "claim_pending_raw_articles",
    { p_limit: batch },
  );

  if (claimError) {
    logger.error("Pending claim başarısız", { reason: claimError.message });
    return {
      processed: 0,
      succeeded: 0,
      failed: 1,
      skipped: 0,
      message: "Kuyruk claim edilemedi",
    };
  }

  const rows = (claimed ?? []) as DbRawArticle[];
  if (rows.length === 0) {
    return {
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      message: "İşlenecek ham haber yok",
    };
  }

  const [{ data: authorsData }, { data: categoriesData }, { data: recentArticles }] =
    await Promise.all([
      ctx.supabase.from("authors").select("*").eq("active", true),
      ctx.supabase
        .from("categories")
        .select("id, slug, name, active")
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      ctx.supabase
        .from("articles")
        .select("author_id")
        .not("author_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

  const authors = (authorsData ?? []) as Author[];
  const categories = (categoriesData ?? []) as Array<{
    id: string;
    slug: string;
    name: string;
    active: boolean;
  }>;
  const recentAuthorIds = (recentArticles ?? [])
    .map((row) => row.author_id as string)
    .filter(Boolean);

  if (authors.length === 0 || categories.length === 0) {
    for (const raw of rows) {
      await ctx.supabase
        .from("raw_articles")
        .update({
          status: "pending",
          last_error: "Yazar veya kategori eksik",
        })
        .eq("id", raw.id)
        .eq("status", "processing");
    }
    return {
      processed: rows.length,
      succeeded: 0,
      failed: rows.length,
      skipped: 0,
      message: "Yazar veya kategori yapılandırması eksik",
    };
  }

  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  for (const raw of rows) {
    const outcome = await processOneRaw(
      ctx,
      raw,
      authors,
      categories,
      recentAuthorIds,
    );
    if (outcome === "success" || outcome === "rejected") succeeded += 1;
    else if (outcome === "skipped") skipped += 1;
    else failed += 1;
  }

  return {
    processed: rows.length,
    succeeded,
    failed,
    skipped,
    message: `${succeeded} başarılı, ${failed} başarısız`,
  };
}

export async function runPublishJob(
  ctx: JobHandlerContext,
): Promise<JobHandlerResult> {
  const { data: claimed, error } = await ctx.supabase.rpc(
    "claim_scheduled_articles",
    { p_limit: MAX_PUBLISH_BATCH },
  );

  if (error) {
    logger.error("Publish claim başarısız", { reason: error.message });
    return {
      processed: 0,
      succeeded: 0,
      failed: 1,
      skipped: 0,
      message: "Yayın claim edilemedi",
    };
  }

  const articles = (claimed ?? []) as Array<{
    id: string;
    slug: string;
    category_id: string | null;
    author_id: string | null;
    status: string;
  }>;

  if (articles.length === 0) {
    return {
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      message: "Yayınlanacak haber yok",
    };
  }

  let succeeded = 0;
  let failed = 0;

  for (const article of articles) {
    try {
      const paths = ["/", `/haber/${article.slug}`];

      if (article.category_id) {
        const { data: category } = await ctx.supabase
          .from("categories")
          .select("slug")
          .eq("id", article.category_id)
          .maybeSingle();
        if (category?.slug) {
          paths.push(`/kategori/${category.slug as string}`);
        }
      }

      if (article.author_id) {
        const { data: author } = await ctx.supabase
          .from("authors")
          .select("slug")
          .eq("id", article.author_id)
          .maybeSingle();
        if (author?.slug) {
          paths.push(`/yazar/${author.slug as string}`);
        }
      }

      const { data: tagRows } = await ctx.supabase
        .from("article_tags")
        .select("tag:tags(slug)")
        .eq("article_id", article.id);

      for (const row of tagRows ?? []) {
        const tag = Array.isArray(row.tag) ? row.tag[0] : row.tag;
        const slug = (tag as { slug?: string } | null)?.slug;
        if (slug) paths.push(`/etiket/${slug}`);
      }

      for (const path of paths) {
        revalidatePath(path);
      }

      succeeded += 1;
    } catch (err) {
      failed += 1;
      logger.warn("Yayın sonrası revalidate başarısız", {
        articleId: article.id,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    processed: articles.length,
    succeeded,
    failed,
    skipped: 0,
    message:
      failed === 0
        ? `${succeeded} haber yayınlandı`
        : `${succeeded} yayınlandı, ${failed} revalidate hatası`,
  };
}

export async function runMaintenanceJob(
  ctx: JobHandlerContext,
): Promise<JobHandlerResult> {
  const retentionDays = LOG_RETENTION_DAYS;
  const cutoff = new Date(
    Date.now() - retentionDays * 24 * 60 * 60 * 1000,
  ).toISOString();
  const staleBefore = new Date(
    Date.now() - STALE_PROCESSING_HOURS * 60 * 60 * 1000,
  ).toISOString();

  let succeeded = 0;
  let failed = 0;
  let processed = 0;

  const steps: Array<{ name: string; run: () => Promise<number> }> = [
    {
      name: "job_runs_cleanup",
      run: async () => {
        const { count, error } = await ctx.supabase
          .from("job_runs")
          .delete({ count: "exact" })
          .lt("started_at", cutoff)
          .neq("status", "running");
        if (error) throw new Error(error.message);
        return count ?? 0;
      },
    },
    {
      name: "ingestion_runs_cleanup",
      run: async () => {
        const { count, error } = await ctx.supabase
          .from("ingestion_runs")
          .delete({ count: "exact" })
          .lt("started_at", cutoff)
          .neq("status", "running");
        if (error) throw new Error(error.message);
        return count ?? 0;
      },
    },
    {
      name: "expired_locks",
      run: async () => {
        const { count, error } = await ctx.supabase
          .from("system_locks")
          .delete({ count: "exact" })
          .lte("expires_at", new Date().toISOString());
        if (error) throw new Error(error.message);
        return count ?? 0;
      },
    },
    {
      name: "stale_processing",
      run: async () => {
        const { data, error } = await ctx.supabase
          .from("raw_articles")
          .update({
            status: "failed",
            last_error: "İşlem zaman aşımına uğradı",
            failure_count: MAX_RAW_FAILURES,
            processed_at: new Date().toISOString(),
          })
          .eq("status", "processing")
          .lt("updated_at", staleBefore)
          .select("id");
        if (error) throw new Error(error.message);
        return data?.length ?? 0;
      },
    },
    {
      name: "source_health",
      run: async () => {
        const { data, error } = await ctx.supabase
          .from("sources")
          .update({ is_unhealthy: true })
          .gte("consecutive_failures", UNHEALTHY_FAILURE_THRESHOLD)
          .eq("is_unhealthy", false)
          .select("id");
        if (error) throw new Error(error.message);
        return data?.length ?? 0;
      },
    },
    {
      name: "orphan_slots",
      run: async () => {
        const { count, error } = await ctx.supabase
          .from("publishing_slots")
          .delete({ count: "exact" })
          .in("status", ["open", "cancelled"])
          .is("article_id", null)
          .lt("created_at", cutoff);
        if (error) throw new Error(error.message);
        return count ?? 0;
      },
    },
  ];

  for (const step of steps) {
    processed += 1;
    try {
      await step.run();
      succeeded += 1;
    } catch (error) {
      failed += 1;
      logger.warn("Maintenance adımı başarısız", {
        step: step.name,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    processed,
    succeeded,
    failed,
    skipped: 0,
    message:
      failed === 0
        ? "Bakım tamamlandı"
        : `Bakım kısmi: ${succeeded}/${processed} adım`,
    metadata: { retentionDays },
  };
}
