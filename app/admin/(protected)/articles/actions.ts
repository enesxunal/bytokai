"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  failResult,
  okResult,
  toActionError,
  type ActionResult,
} from "@/lib/admin/action-result";
import { writeAuditLog } from "@/lib/admin/audit";
import { istanbulDatetimeLocalToUtcIso } from "@/lib/utils/date";
import { requireAdminAction } from "@/lib/auth/session";
import type { DbArticle, DbArticleStatus } from "@/lib/database/types";
import { markdownToSafeHtml } from "@/lib/utils/markdown";
import { calculateReadingTime } from "@/lib/utils/reading-time";
import { slugifyTurkish } from "@/lib/utils/slug";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("admin.article-actions");

const uuidSchema = z.string().uuid("Geçersiz haber kimliği");

const articleStatusSchema = z.enum([
  "draft",
  "needs_review",
  "scheduled",
  "published",
  "archived",
  "failed",
]);

const scheduleSchema = z.object({
  id: uuidSchema,
  scheduledAtLocal: z
    .string()
    .min(1, "Planlanan tarih gerekli")
    .refine((value) => istanbulDatetimeLocalToUtcIso(value) !== null, {
      message: "Geçerli bir tarih ve saat girin",
    }),
});

const updateArticleSchema = z
  .object({
    id: uuidSchema,
    title: z.string().trim().min(1, "Başlık gerekli").max(300),
    slug: z
      .string()
      .trim()
      .min(1, "Slug gerekli")
      .max(220)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug yalnızca küçük harf, rakam ve tire içerebilir"),
    excerpt: z.string().trim().max(1000),
    contentMarkdown: z.string().max(200_000),
    categoryId: z.union([z.string().uuid(), z.literal("")]).nullable().optional(),
    authorId: z.union([z.string().uuid(), z.literal("")]).nullable().optional(),
    tags: z.string().max(2000),
    coverImageUrl: z
      .string()
      .trim()
      .max(2000)
      .refine(
        (value) =>
          !value ||
          value.startsWith("/") ||
          /^https?:\/\//i.test(value),
        "Kapak görseli geçerli bir URL olmalı",
      ),
    seoTitle: z.string().trim().max(120),
    seoDescription: z.string().trim().max(320),
    featured: z.boolean(),
    breaking: z.boolean(),
    status: articleStatusSchema,
    scheduledAtLocal: z.string().trim().max(32),
    sourceName: z.string().trim().max(200),
    sourceUrl: z
      .string()
      .trim()
      .max(2000)
      .refine(
        (value) => !value || /^https?:\/\//i.test(value),
        "Kaynak URL geçerli olmalı",
      ),
  })
  .superRefine((data, ctx) => {
    if (data.status === "scheduled") {
      const utc = istanbulDatetimeLocalToUtcIso(data.scheduledAtLocal);
      if (!utc) {
        ctx.addIssue({
          code: "custom",
          path: ["scheduledAtLocal"],
          message: "Planlanan haber için tarih ve saat gerekli",
        });
        return;
      }
      if (new Date(utc).getTime() <= Date.now()) {
        ctx.addIssue({
          code: "custom",
          path: ["scheduledAtLocal"],
          message: "Planlanan tarih gelecekte olmalı",
        });
      }
    }
  });

export type UpdateArticleInput = z.infer<typeof updateArticleSchema>;

function dbFail(action: string, reason: string): ActionResult<never> {
  logger.error("Haber işlemi başarısız", { action, reason });
  return failResult("İşlem tamamlanamadı. Lütfen tekrar deneyin.");
}

function snapshotArticle(article: DbArticle): Record<string, unknown> {
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    status: article.status,
    featured: article.featured,
    breaking: article.breaking,
    category_id: article.category_id,
    author_id: article.author_id,
    scheduled_at: article.scheduled_at,
    published_at: article.published_at,
    seo_title: article.seo_title,
    seo_description: article.seo_description,
    source_name: article.source_name,
    source_url: article.source_url,
  };
}

function revalidateArticlePaths(id: string, slug?: string | null) {
  revalidatePath("/admin/articles");
  revalidatePath(`/admin/articles/${id}`);
  revalidatePath(`/admin/articles/${id}/edit`);
  if (slug) {
    revalidatePath(`/haber/${slug}`);
    revalidatePath("/");
  }
}

async function fetchArticle(
  supabase: Awaited<ReturnType<typeof requireAdminAction>>["supabase"],
  id: string,
): Promise<{ article: DbArticle | null; error: string | null }> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return { article: null, error: error.message };
  }

  return { article: (data as DbArticle | null) ?? null, error: null };
}

function parseTagNames(raw: string): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const part of raw.split(/[,;\n]/)) {
    const name = part.trim().replace(/\s+/g, " ");
    if (!name || name.length > 80) continue;
    const key = name.toLocaleLowerCase("tr-TR");
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
    if (names.length >= 20) break;
  }
  return names;
}

async function syncArticleTags(
  supabase: Awaited<ReturnType<typeof requireAdminAction>>["supabase"],
  articleId: string,
  tagNames: string[],
): Promise<void> {
  const { data: existingLinks, error: linksError } = await supabase
    .from("article_tags")
    .select("tag_id")
    .eq("article_id", articleId);

  if (linksError) {
    throw new Error(linksError.message);
  }

  const existingTagIds = new Set(
    (existingLinks ?? []).map((row) => row.tag_id as string),
  );

  if (tagNames.length === 0) {
    if (existingTagIds.size > 0) {
      const { error } = await supabase
        .from("article_tags")
        .delete()
        .eq("article_id", articleId);
      if (error) throw new Error(error.message);
    }
    return;
  }

  const desiredTagIds: string[] = [];

  for (const name of tagNames) {
    const slug = slugifyTurkish(name) || "etiket";
    const { data: existing } = await supabase
      .from("tags")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existing?.id) {
      desiredTagIds.push(existing.id as string);
      continue;
    }

    const { data: created, error: createError } = await supabase
      .from("tags")
      .insert({ name, slug })
      .select("id")
      .single();

    if (createError || !created) {
      throw new Error(createError?.message ?? "Etiket oluşturulamadı");
    }

    desiredTagIds.push(created.id as string);
  }

  const desiredSet = new Set(desiredTagIds);
  const toRemove = [...existingTagIds].filter((id) => !desiredSet.has(id));
  const toAdd = desiredTagIds.filter((id) => !existingTagIds.has(id));

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("article_tags")
      .delete()
      .eq("article_id", articleId)
      .in("tag_id", toRemove);
    if (error) throw new Error(error.message);
  }

  if (toAdd.length > 0) {
    const { error } = await supabase.from("article_tags").insert(
      toAdd.map((tagId) => ({
        article_id: articleId,
        tag_id: tagId,
      })),
    );
    if (error) throw new Error(error.message);
  }
}

function nullableId(value: string | null | undefined): string | null {
  if (!value || value === "") return null;
  return value;
}

function valuesEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export async function publishArticleNow(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = uuidSchema.parse(id);
    const { user, supabase } = await requireAdminAction();
    const fetched = await fetchArticle(supabase, parsed);
    if (fetched.error) return dbFail("publish.fetch", fetched.error);
    const current = fetched.article;

    if (!current) {
      return failResult("Haber bulunamadı");
    }

    if (current.status === "published") {
      return okResult({ id: parsed }, "Haber zaten yayında");
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("articles")
      .update({
        status: "published" satisfies DbArticleStatus,
        published_at: current.published_at ?? now,
        scheduled_at: null,
      })
      .eq("id", parsed)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return dbFail("publish", error?.message ?? "update failed");
    }

    await writeAuditLog(supabase, {
      actorId: user.id,
      action: "article.publish",
      entityType: "article",
      entityId: parsed,
      beforeData: snapshotArticle(current),
      afterData: snapshotArticle(data as DbArticle),
    });

    revalidateArticlePaths(parsed, (data as DbArticle).slug);
    return okResult({ id: parsed }, "Haber yayınlandı");
  } catch (error) {
    return toActionError(error);
  }
}

export async function scheduleArticle(input: {
  id: string;
  scheduledAtLocal: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = scheduleSchema.parse(input);
    const utc = istanbulDatetimeLocalToUtcIso(parsed.scheduledAtLocal);
    if (!utc) {
      return failResult("Geçerli bir planlama tarihi girin");
    }
    if (new Date(utc).getTime() <= Date.now()) {
      return failResult("Planlanan tarih gelecekte olmalı");
    }

    const { user, supabase } = await requireAdminAction();
    const fetched = await fetchArticle(supabase, parsed.id);
    if (fetched.error) return dbFail("schedule.fetch", fetched.error);
    const current = fetched.article;

    if (!current) {
      return failResult("Haber bulunamadı");
    }

    if (
      current.status === "scheduled" &&
      current.scheduled_at === utc
    ) {
      return okResult({ id: parsed.id }, "Haber zaten bu tarihe planlandı");
    }

    const { data, error } = await supabase
      .from("articles")
      .update({
        status: "scheduled" satisfies DbArticleStatus,
        scheduled_at: utc,
        published_at: null,
      })
      .eq("id", parsed.id)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return dbFail("schedule", error?.message ?? "update failed");
    }

    await writeAuditLog(supabase, {
      actorId: user.id,
      action: "article.schedule",
      entityType: "article",
      entityId: parsed.id,
      beforeData: snapshotArticle(current),
      afterData: snapshotArticle(data as DbArticle),
    });

    revalidateArticlePaths(parsed.id, (data as DbArticle).slug);
    return okResult({ id: parsed.id }, "Haber planlandı");
  } catch (error) {
    return toActionError(error);
  }
}

export async function unpublishArticle(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = uuidSchema.parse(id);
    const { user, supabase } = await requireAdminAction();
    const fetched = await fetchArticle(supabase, parsed);
    if (fetched.error) return dbFail("unpublish.fetch", fetched.error);
    const current = fetched.article;

    if (!current) {
      return failResult("Haber bulunamadı");
    }

    if (current.status !== "published") {
      return okResult({ id: parsed }, "Haber zaten yayında değil");
    }

    const { data, error } = await supabase
      .from("articles")
      .update({
        status: "draft" satisfies DbArticleStatus,
      })
      .eq("id", parsed)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return dbFail("unpublish", error?.message ?? "update failed");
    }

    await writeAuditLog(supabase, {
      actorId: user.id,
      action: "article.unpublish",
      entityType: "article",
      entityId: parsed,
      beforeData: snapshotArticle(current),
      afterData: snapshotArticle(data as DbArticle),
    });

    revalidateArticlePaths(parsed, current.slug);
    return okResult({ id: parsed }, "Haber yayından kaldırıldı");
  } catch (error) {
    return toActionError(error);
  }
}

export async function setArticleFeatured(
  id: string,
  featured: boolean,
): Promise<ActionResult<{ id: string; featured: boolean }>> {
  try {
    const parsed = uuidSchema.parse(id);
    const featuredFlag = z.boolean().parse(featured);
    const { user, supabase } = await requireAdminAction();
    const fetched = await fetchArticle(supabase, parsed);
    if (fetched.error) return dbFail("feature.fetch", fetched.error);
    const current = fetched.article;

    if (!current) {
      return failResult("Haber bulunamadı");
    }

    if (current.featured === featuredFlag) {
      return okResult(
        { id: parsed, featured: featuredFlag },
        featuredFlag ? "Haber zaten öne çıkan" : "Haber zaten öne çıkan değil",
      );
    }

    const { data, error } = await supabase
      .from("articles")
      .update({ featured: featuredFlag })
      .eq("id", parsed)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return dbFail("feature", error?.message ?? "update failed");
    }

    await writeAuditLog(supabase, {
      actorId: user.id,
      action: featuredFlag ? "article.feature" : "article.unfeature",
      entityType: "article",
      entityId: parsed,
      beforeData: snapshotArticle(current),
      afterData: snapshotArticle(data as DbArticle),
    });

    revalidateArticlePaths(parsed, (data as DbArticle).slug);
    return okResult(
      { id: parsed, featured: featuredFlag },
      featuredFlag ? "Haber öne çıkarıldı" : "Öne çıkarma kaldırıldı",
    );
  } catch (error) {
    return toActionError(error);
  }
}

export async function archiveArticle(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = uuidSchema.parse(id);
    const { user, supabase } = await requireAdminAction();
    const fetched = await fetchArticle(supabase, parsed);
    if (fetched.error) return dbFail("archive.fetch", fetched.error);
    const current = fetched.article;

    if (!current) {
      return failResult("Haber bulunamadı");
    }

    if (current.status === "archived") {
      return okResult({ id: parsed }, "Haber zaten arşivde");
    }

    const { data, error } = await supabase
      .from("articles")
      .update({
        status: "archived" satisfies DbArticleStatus,
        featured: false,
      })
      .eq("id", parsed)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return dbFail("archive", error?.message ?? "update failed");
    }

    await writeAuditLog(supabase, {
      actorId: user.id,
      action: "article.archive",
      entityType: "article",
      entityId: parsed,
      beforeData: snapshotArticle(current),
      afterData: snapshotArticle(data as DbArticle),
    });

    revalidateArticlePaths(parsed, current.slug);
    return okResult({ id: parsed }, "Haber arşivlendi");
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteArticle(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = uuidSchema.parse(id);
    const { user, supabase } = await requireAdminAction();
    const fetched = await fetchArticle(supabase, parsed);
    if (fetched.error) return dbFail("delete.fetch", fetched.error);
    const current = fetched.article;

    if (!current) {
      return okResult({ id: parsed }, "Haber zaten silinmiş");
    }

    const { error } = await supabase.from("articles").delete().eq("id", parsed);

    if (error) {
      return dbFail("delete", error.message);
    }

    await writeAuditLog(supabase, {
      actorId: user.id,
      action: "article.delete",
      entityType: "article",
      entityId: parsed,
      beforeData: snapshotArticle(current),
      afterData: null,
    });

    revalidateArticlePaths(parsed, current.slug);
    return okResult({ id: parsed }, "Haber silindi");
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateArticle(
  input: UpdateArticleInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = updateArticleSchema.parse(input);
    const { user, supabase } = await requireAdminAction();
    const fetched = await fetchArticle(supabase, parsed.id);
    if (fetched.error) return dbFail("update.fetch", fetched.error);
    const current = fetched.article;

    if (!current) {
      return failResult("Haber bulunamadı");
    }

    const categoryId = nullableId(parsed.categoryId ?? null);
    const authorId = nullableId(parsed.authorId ?? null);
    const coverImageUrl = parsed.coverImageUrl.trim() || null;
    const seoTitle = parsed.seoTitle.trim() || null;
    const seoDescription = parsed.seoDescription.trim() || null;
    const sourceName = parsed.sourceName.trim() || null;
    const sourceUrl = parsed.sourceUrl.trim() || null;
    const tagNames = parseTagNames(parsed.tags);

    let scheduledAt: string | null = current.scheduled_at;
    let publishedAt: string | null = current.published_at;

    if (parsed.status === "scheduled") {
      scheduledAt = istanbulDatetimeLocalToUtcIso(parsed.scheduledAtLocal);
      publishedAt = null;
    } else if (parsed.status === "published") {
      scheduledAt = null;
      publishedAt = current.published_at ?? new Date().toISOString();
    } else if (parsed.scheduledAtLocal) {
      scheduledAt = istanbulDatetimeLocalToUtcIso(parsed.scheduledAtLocal);
    } else {
      scheduledAt = null;
    }

    const contentHtml = markdownToSafeHtml(parsed.contentMarkdown);
    const readingTime = calculateReadingTime(parsed.contentMarkdown);

    const nextPatch = {
      title: parsed.title,
      slug: parsed.slug,
      excerpt: parsed.excerpt,
      content_markdown: parsed.contentMarkdown,
      content_html: contentHtml,
      category_id: categoryId,
      author_id: authorId,
      cover_image_url: coverImageUrl,
      seo_title: seoTitle,
      seo_description: seoDescription,
      featured: parsed.featured,
      breaking: parsed.breaking,
      status: parsed.status,
      scheduled_at: scheduledAt,
      published_at: publishedAt,
      source_name: sourceName,
      source_url: sourceUrl,
      reading_time_minutes: readingTime,
    };

    const currentComparable = {
      title: current.title,
      slug: current.slug,
      excerpt: current.excerpt,
      content_markdown: current.content_markdown,
      category_id: current.category_id,
      author_id: current.author_id,
      cover_image_url: current.cover_image_url,
      seo_title: current.seo_title,
      seo_description: current.seo_description,
      featured: current.featured,
      breaking: current.breaking,
      status: current.status,
      scheduled_at: current.scheduled_at,
      published_at: current.published_at,
      source_name: current.source_name,
      source_url: current.source_url,
      reading_time_minutes: current.reading_time_minutes,
      content_html: current.content_html,
    };

    const nextComparable = {
      title: nextPatch.title,
      slug: nextPatch.slug,
      excerpt: nextPatch.excerpt,
      content_markdown: nextPatch.content_markdown,
      category_id: nextPatch.category_id,
      author_id: nextPatch.author_id,
      cover_image_url: nextPatch.cover_image_url,
      seo_title: nextPatch.seo_title,
      seo_description: nextPatch.seo_description,
      featured: nextPatch.featured,
      breaking: nextPatch.breaking,
      status: nextPatch.status,
      scheduled_at: nextPatch.scheduled_at,
      published_at: nextPatch.published_at,
      source_name: nextPatch.source_name,
      source_url: nextPatch.source_url,
      reading_time_minutes: nextPatch.reading_time_minutes,
      content_html: nextPatch.content_html,
    };

    const articleUnchanged = valuesEqual(currentComparable, nextComparable);

    const { data: currentTagRows } = await supabase
      .from("article_tags")
      .select("tag:tags(name)")
      .eq("article_id", parsed.id);

    const currentTagNames = (currentTagRows ?? [])
      .map((row) => {
        const tag = Array.isArray(row.tag) ? row.tag[0] : row.tag;
        return typeof tag?.name === "string" ? tag.name : null;
      })
      .filter((name): name is string => Boolean(name))
      .sort((a, b) => a.localeCompare(b, "tr"));

    const nextTagNames = [...tagNames].sort((a, b) => a.localeCompare(b, "tr"));
    const tagsUnchanged = valuesEqual(currentTagNames, nextTagNames);

    if (articleUnchanged && tagsUnchanged) {
      return okResult({ id: parsed.id }, "Değişiklik yok");
    }

    if (parsed.slug !== current.slug) {
      const { data: slugConflict } = await supabase
        .from("articles")
        .select("id")
        .eq("slug", parsed.slug)
        .neq("id", parsed.id)
        .maybeSingle();

      if (slugConflict) {
        return failResult("Bu slug başka bir haberde kullanılıyor", {
          slug: ["Bu slug başka bir haberde kullanılıyor"],
        });
      }
    }

    let updated = current;

    if (!articleUnchanged) {
      const { data, error } = await supabase
        .from("articles")
        .update(nextPatch)
        .eq("id", parsed.id)
        .select("*")
        .maybeSingle();

      if (error || !data) {
        return dbFail("update", error?.message ?? "update failed");
      }
      updated = data as DbArticle;
    }

    if (!tagsUnchanged) {
      try {
        await syncArticleTags(supabase, parsed.id, tagNames);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "tag sync failed";
        return dbFail("update.tags", message);
      }
    }

    await writeAuditLog(supabase, {
      actorId: user.id,
      action: "article.update",
      entityType: "article",
      entityId: parsed.id,
      beforeData: {
        ...snapshotArticle(current),
        tags: currentTagNames,
      },
      afterData: {
        ...snapshotArticle(updated),
        tags: nextTagNames,
      },
    });

    revalidateArticlePaths(parsed.id, updated.slug);
    if (current.slug !== updated.slug) {
      revalidatePath(`/haber/${current.slug}`);
    }

    return okResult({ id: parsed.id }, "Haber kaydedildi");
  } catch (error) {
    return toActionError(error);
  }
}
