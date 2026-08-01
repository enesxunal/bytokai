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
import { loadTagMergeOptions } from "@/lib/admin/tags";
import { requireAdminAction } from "@/lib/auth/session";
import type { DbTag } from "@/lib/database/types";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("admin.tag-actions");

const uuidSchema = z.string().uuid("Geçersiz etiket kimliği");

const tagInputSchema = z.object({
  name: z.string().trim().min(1, "Ad gerekli").max(120),
  slug: z
    .string()
    .trim()
    .min(1, "Slug gerekli")
    .max(120)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug yalnızca küçük harf, rakam ve tire içerebilir",
    ),
});

const updateTagSchema = tagInputSchema.extend({
  id: uuidSchema,
});

const mergeTagsSchema = z
  .object({
    sourceId: uuidSchema,
    targetId: uuidSchema,
  })
  .refine((value) => value.sourceId !== value.targetId, {
    message: "Etiket kendisiyle birleştirilemez",
    path: ["targetId"],
  });

export type TagFormInput = z.infer<typeof tagInputSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;

function dbFail(action: string, reason: string): ActionResult<never> {
  logger.error("Etiket işlemi başarısız", { action, reason });
  return failResult("İşlem tamamlanamadı. Lütfen tekrar deneyin.");
}

function snapshotTag(tag: DbTag): Record<string, unknown> {
  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    created_at: tag.created_at,
  };
}

function revalidateTagPaths(id?: string, slug?: string | null) {
  revalidatePath("/admin/tags");
  if (id) {
    revalidatePath(`/admin/tags/${id}`);
    revalidatePath(`/admin/tags/${id}/edit`);
  }
  if (slug) {
    revalidatePath(`/etiket/${slug}`);
  }
  revalidatePath("/admin");
}

async function fetchTag(
  supabase: Awaited<ReturnType<typeof requireAdminAction>>["supabase"],
  id: string,
): Promise<{ tag: DbTag | null; error: string | null }> {
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return { tag: null, error: error.message };
  }

  return { tag: (data as DbTag | null) ?? null, error: null };
}

function valuesEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function toTagPayload(parsed: TagFormInput) {
  return {
    name: parsed.name,
    slug: parsed.slug,
  };
}

export async function createTag(
  input: TagFormInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = tagInputSchema.parse(input);
    const { user, supabase } = await requireAdminAction();

    const { data: slugConflict } = await supabase
      .from("tags")
      .select("id")
      .eq("slug", parsed.slug)
      .maybeSingle();

    if (slugConflict) {
      return failResult("Bu slug zaten kullanılıyor", {
        slug: ["Bu slug zaten kullanılıyor"],
      });
    }

    const payload = toTagPayload(parsed);

    const { data, error } = await supabase
      .from("tags")
      .insert(payload)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return dbFail("create", error?.message ?? "insert failed");
    }

    const created = data as DbTag;

    await writeAuditLog(supabase, {
      actorId: user.id,
      action: "tag.create",
      entityType: "tag",
      entityId: created.id,
      beforeData: null,
      afterData: snapshotTag(created),
    });

    revalidateTagPaths(created.id, created.slug);
    return okResult({ id: created.id }, "Etiket oluşturuldu");
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateTag(
  input: UpdateTagInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = updateTagSchema.parse(input);
    const { user, supabase } = await requireAdminAction();
    const fetched = await fetchTag(supabase, parsed.id);
    if (fetched.error) return dbFail("update.fetch", fetched.error);
    const current = fetched.tag;

    if (!current) {
      return failResult("Etiket bulunamadı");
    }

    if (parsed.slug !== current.slug) {
      const { data: slugConflict } = await supabase
        .from("tags")
        .select("id")
        .eq("slug", parsed.slug)
        .neq("id", parsed.id)
        .maybeSingle();

      if (slugConflict) {
        return failResult("Bu slug zaten kullanılıyor", {
          slug: ["Bu slug zaten kullanılıyor"],
        });
      }
    }

    const nextPatch = toTagPayload(parsed);
    const currentComparable = {
      name: current.name,
      slug: current.slug,
    };

    if (valuesEqual(currentComparable, nextPatch)) {
      return okResult({ id: parsed.id }, "Değişiklik yok");
    }

    const { data, error } = await supabase
      .from("tags")
      .update(nextPatch)
      .eq("id", parsed.id)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return dbFail("update", error?.message ?? "update failed");
    }

    const updated = data as DbTag;

    await writeAuditLog(supabase, {
      actorId: user.id,
      action: "tag.update",
      entityType: "tag",
      entityId: parsed.id,
      beforeData: snapshotTag(current),
      afterData: snapshotTag(updated),
    });

    revalidateTagPaths(parsed.id, updated.slug);
    if (current.slug !== updated.slug) {
      revalidatePath(`/etiket/${current.slug}`);
    }

    return okResult({ id: parsed.id }, "Etiket kaydedildi");
  } catch (error) {
    return toActionError(error);
  }
}

export async function getMergeTagOptions(
  sourceId: string,
): Promise<
  ActionResult<Array<{ id: string; name: string; slug: string }>>
> {
  try {
    const parsed = uuidSchema.parse(sourceId);
    await requireAdminAction();
    const { connected, options } = await loadTagMergeOptions(parsed);
    if (!connected) {
      return failResult("Veritabanı bağlantısı yok");
    }
    return okResult(options);
  } catch (error) {
    return toActionError(error);
  }
}

/**
 * Güvenli birleştirme (mevcut şema):
 * 1) Kaynak ilişkileri hedefe aktarılır (PK sayesinde duplicate oluşmaz)
 * 2) Kaynak etiket silinir (article_tags CASCADE)
 * Retry güvenlidir / idempotenttir.
 */
export async function mergeTags(
  sourceId: string,
  targetId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = mergeTagsSchema.parse({ sourceId, targetId });
    const { user, supabase } = await requireAdminAction();

    const [sourceFetched, targetFetched] = await Promise.all([
      fetchTag(supabase, parsed.sourceId),
      fetchTag(supabase, parsed.targetId),
    ]);

    if (sourceFetched.error) {
      return dbFail("merge.sourceFetch", sourceFetched.error);
    }
    if (targetFetched.error) {
      return dbFail("merge.targetFetch", targetFetched.error);
    }

    const source = sourceFetched.tag;
    const target = targetFetched.tag;

    if (!source) {
      if (target) {
        revalidateTagPaths(target.id, target.slug);
        return okResult(
          { id: parsed.targetId },
          "Kaynak etiket zaten birleştirilmiş veya silinmiş",
        );
      }
      return okResult(
        { id: parsed.targetId },
        "Kaynak etiket zaten birleştirilmiş veya silinmiş",
      );
    }

    if (!target) {
      return failResult("Hedef etiket bulunamadı");
    }

    const { data: sourceLinks, error: sourceLinksError } = await supabase
      .from("article_tags")
      .select("article_id")
      .eq("tag_id", parsed.sourceId);

    if (sourceLinksError) {
      return dbFail("merge.sourceLinks", sourceLinksError.message);
    }

    const sourceArticleIds = [
      ...new Set(
        (sourceLinks ?? [])
          .map((row) => row.article_id as string)
          .filter(Boolean),
      ),
    ];

    if (sourceArticleIds.length > 0) {
      const { data: targetLinks, error: targetLinksError } = await supabase
        .from("article_tags")
        .select("article_id")
        .eq("tag_id", parsed.targetId)
        .in("article_id", sourceArticleIds);

      if (targetLinksError) {
        return dbFail("merge.targetLinks", targetLinksError.message);
      }

      const alreadyOnTarget = new Set(
        (targetLinks ?? []).map((row) => row.article_id as string),
      );

      const toInsert = sourceArticleIds
        .filter((articleId) => !alreadyOnTarget.has(articleId))
        .map((articleId) => ({
          article_id: articleId,
          tag_id: parsed.targetId,
        }));

      if (toInsert.length > 0) {
        const { error: insertError } = await supabase
          .from("article_tags")
          .upsert(toInsert, {
            onConflict: "article_id,tag_id",
            ignoreDuplicates: true,
          });

        if (insertError) {
          return dbFail("merge.insert", insertError.message);
        }
      }
    }

    const { error: deleteError } = await supabase
      .from("tags")
      .delete()
      .eq("id", parsed.sourceId);

    if (deleteError) {
      return dbFail("merge.deleteSource", deleteError.message);
    }

    await writeAuditLog(supabase, {
      actorId: user.id,
      action: "tag.merge",
      entityType: "tag",
      entityId: parsed.targetId,
      beforeData: {
        source: snapshotTag(source),
        target: snapshotTag(target),
        moved_article_count: sourceArticleIds.length,
      },
      afterData: {
        target: snapshotTag(target),
        source_deleted: true,
      },
    });

    revalidateTagPaths(undefined, source.slug);
    revalidateTagPaths(target.id, target.slug);

    return okResult(
      { id: parsed.targetId },
      `“${source.name}” etiketi “${target.name}” ile birleştirildi`,
    );
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteTag(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = uuidSchema.parse(id);
    const { user, supabase } = await requireAdminAction();
    const fetched = await fetchTag(supabase, parsed);
    if (fetched.error) return dbFail("delete.fetch", fetched.error);
    const current = fetched.tag;

    if (!current) {
      return okResult({ id: parsed }, "Etiket zaten silinmiş");
    }

    const { count, error: countError } = await supabase
      .from("article_tags")
      .select("article_id", { count: "exact", head: true })
      .eq("tag_id", parsed);

    if (countError) {
      return dbFail("delete.count", countError.message);
    }

    if ((count ?? 0) > 0) {
      return failResult(
        `Bu etikete bağlı ${count} haber var. Silmek yerine başka bir etiketle birleştirin.`,
      );
    }

    const { error } = await supabase.from("tags").delete().eq("id", parsed);

    if (error) {
      return dbFail("delete", error.message);
    }

    await writeAuditLog(supabase, {
      actorId: user.id,
      action: "tag.delete",
      entityType: "tag",
      entityId: parsed,
      beforeData: snapshotTag(current),
      afterData: null,
    });

    revalidateTagPaths(undefined, current.slug);
    return okResult({ id: parsed }, "Etiket silindi");
  } catch (error) {
    return toActionError(error);
  }
}
