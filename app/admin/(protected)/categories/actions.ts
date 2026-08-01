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
import { requireAdminAction } from "@/lib/auth/session";
import type { DbCategory } from "@/lib/database/types";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("admin.category-actions");

const uuidSchema = z.string().uuid("Geçersiz kategori kimliği");

const colorSchema = z
  .string()
  .trim()
  .min(1, "Renk gerekli")
  .max(32, "Renk değeri çok uzun")
  .regex(
    /^(#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?|[a-zA-Z][a-zA-Z0-9_-]*)$/,
    "Renk #RGB / #RRGGBB veya güvenli metin olmalı",
  );

const themeSchema = z
  .string()
  .trim()
  .min(1, "Tema gerekli")
  .max(64, "Tema çok uzun")
  .regex(
    /^[a-zA-Z0-9]+(?:[-_][a-zA-Z0-9]+)*$/,
    "Tema yalnızca harf, rakam, tire ve alt çizgi içerebilir",
  );

const sortOrderSchema = z
  .number({ message: "Sıralama sayı olmalı" })
  .int("Sıralama tam sayı olmalı")
  .min(0, "Sıralama en az 0 olmalı")
  .max(10_000, "Sıralama en fazla 10000 olabilir");

const categoryInputSchema = z.object({
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
  description: z.string().trim().max(2000),
  color: colorSchema,
  theme: themeSchema,
  sort_order: sortOrderSchema,
  active: z.boolean(),
});

const updateCategorySchema = categoryInputSchema.extend({
  id: uuidSchema,
});

const setSortOrderSchema = z.object({
  id: uuidSchema,
  sort_order: sortOrderSchema,
});

export type CategoryFormInput = z.infer<typeof categoryInputSchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

function dbFail(action: string, reason: string): ActionResult<never> {
  logger.error("Kategori işlemi başarısız", { action, reason });
  return failResult("İşlem tamamlanamadı. Lütfen tekrar deneyin.");
}

function snapshotCategory(category: DbCategory): Record<string, unknown> {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    color: category.color,
    theme: category.theme,
    active: category.active,
    sort_order: category.sort_order,
  };
}

function revalidateCategoryPaths(id?: string, slug?: string | null) {
  revalidatePath("/admin/categories");
  if (id) {
    revalidatePath(`/admin/categories/${id}`);
    revalidatePath(`/admin/categories/${id}/edit`);
  }
  if (slug) {
    revalidatePath(`/kategori/${slug}`);
  }
  revalidatePath("/admin");
  revalidatePath("/");
}

async function fetchCategory(
  supabase: Awaited<ReturnType<typeof requireAdminAction>>["supabase"],
  id: string,
): Promise<{ category: DbCategory | null; error: string | null }> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return { category: null, error: error.message };
  }

  return { category: (data as DbCategory | null) ?? null, error: null };
}

function valuesEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function toCategoryPayload(parsed: CategoryFormInput) {
  return {
    name: parsed.name,
    slug: parsed.slug,
    description: parsed.description,
    color: parsed.color,
    theme: parsed.theme,
    sort_order: parsed.sort_order,
    active: parsed.active,
  };
}

export async function createCategory(
  input: CategoryFormInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = categoryInputSchema.parse(input);
    const { user, supabase } = await requireAdminAction();

    const { data: slugConflict } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", parsed.slug)
      .maybeSingle();

    if (slugConflict) {
      return failResult("Bu slug zaten kullanılıyor", {
        slug: ["Bu slug zaten kullanılıyor"],
      });
    }

    const payload = toCategoryPayload(parsed);

    const { data, error } = await supabase
      .from("categories")
      .insert(payload)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return dbFail("create", error?.message ?? "insert failed");
    }

    const created = data as DbCategory;

    await writeAuditLog(supabase, {
      actorId: user.id,
      action: "category.create",
      entityType: "category",
      entityId: created.id,
      beforeData: null,
      afterData: snapshotCategory(created),
    });

    revalidateCategoryPaths(created.id, created.slug);
    return okResult({ id: created.id }, "Kategori oluşturuldu");
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateCategory(
  input: UpdateCategoryInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = updateCategorySchema.parse(input);
    const { user, supabase } = await requireAdminAction();
    const fetched = await fetchCategory(supabase, parsed.id);
    if (fetched.error) return dbFail("update.fetch", fetched.error);
    const current = fetched.category;

    if (!current) {
      return failResult("Kategori bulunamadı");
    }

    if (parsed.slug !== current.slug) {
      const { data: slugConflict } = await supabase
        .from("categories")
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

    const nextPatch = toCategoryPayload(parsed);

    const currentComparable = {
      name: current.name,
      slug: current.slug,
      description: current.description,
      color: current.color,
      theme: current.theme,
      sort_order: current.sort_order,
      active: current.active,
    };

    if (valuesEqual(currentComparable, nextPatch)) {
      return okResult({ id: parsed.id }, "Değişiklik yok");
    }

    const { data, error } = await supabase
      .from("categories")
      .update(nextPatch)
      .eq("id", parsed.id)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return dbFail("update", error?.message ?? "update failed");
    }

    const updated = data as DbCategory;

    await writeAuditLog(supabase, {
      actorId: user.id,
      action: "category.update",
      entityType: "category",
      entityId: parsed.id,
      beforeData: snapshotCategory(current),
      afterData: snapshotCategory(updated),
    });

    revalidateCategoryPaths(parsed.id, updated.slug);
    if (current.slug !== updated.slug) {
      revalidatePath(`/kategori/${current.slug}`);
    }

    return okResult({ id: parsed.id }, "Kategori kaydedildi");
  } catch (error) {
    return toActionError(error);
  }
}

export async function setCategoryActive(
  id: string,
  active: boolean,
): Promise<ActionResult<{ id: string; active: boolean }>> {
  try {
    const parsed = uuidSchema.parse(id);
    const activeFlag = z.boolean().parse(active);
    const { user, supabase } = await requireAdminAction();
    const fetched = await fetchCategory(supabase, parsed);
    if (fetched.error) return dbFail("setActive.fetch", fetched.error);
    const current = fetched.category;

    if (!current) {
      return failResult("Kategori bulunamadı");
    }

    if (current.active === activeFlag) {
      return okResult(
        { id: parsed, active: activeFlag },
        activeFlag ? "Kategori zaten aktif" : "Kategori zaten pasif",
      );
    }

    const { data, error } = await supabase
      .from("categories")
      .update({ active: activeFlag })
      .eq("id", parsed)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return dbFail("setActive", error?.message ?? "update failed");
    }

    await writeAuditLog(supabase, {
      actorId: user.id,
      action: activeFlag ? "category.enable" : "category.disable",
      entityType: "category",
      entityId: parsed,
      beforeData: snapshotCategory(current),
      afterData: snapshotCategory(data as DbCategory),
    });

    revalidateCategoryPaths(parsed, current.slug);
    return okResult(
      { id: parsed, active: activeFlag },
      activeFlag ? "Kategori aktifleştirildi" : "Kategori pasifleştirildi",
    );
  } catch (error) {
    return toActionError(error);
  }
}

export async function setCategorySortOrder(
  id: string,
  sortOrder: number,
): Promise<ActionResult<{ id: string; sort_order: number }>> {
  try {
    const parsed = setSortOrderSchema.parse({ id, sort_order: sortOrder });
    const { user, supabase } = await requireAdminAction();
    const fetched = await fetchCategory(supabase, parsed.id);
    if (fetched.error) return dbFail("setSortOrder.fetch", fetched.error);
    const current = fetched.category;

    if (!current) {
      return failResult("Kategori bulunamadı");
    }

    if (current.sort_order === parsed.sort_order) {
      return okResult(
        { id: parsed.id, sort_order: parsed.sort_order },
        "Sıralama zaten aynı",
      );
    }

    const { data, error } = await supabase
      .from("categories")
      .update({ sort_order: parsed.sort_order })
      .eq("id", parsed.id)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return dbFail("setSortOrder", error?.message ?? "update failed");
    }

    await writeAuditLog(supabase, {
      actorId: user.id,
      action: "category.sort",
      entityType: "category",
      entityId: parsed.id,
      beforeData: snapshotCategory(current),
      afterData: snapshotCategory(data as DbCategory),
    });

    revalidateCategoryPaths(parsed.id, current.slug);
    return okResult(
      { id: parsed.id, sort_order: parsed.sort_order },
      "Sıralama güncellendi",
    );
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteCategory(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = uuidSchema.parse(id);
    const { user, supabase } = await requireAdminAction();
    const fetched = await fetchCategory(supabase, parsed);
    if (fetched.error) return dbFail("delete.fetch", fetched.error);
    const current = fetched.category;

    if (!current) {
      return okResult({ id: parsed }, "Kategori zaten silinmiş");
    }

    const { count, error: countError } = await supabase
      .from("articles")
      .select("id", { count: "exact", head: true })
      .eq("category_id", parsed);

    if (countError) {
      return dbFail("delete.count", countError.message);
    }

    if ((count ?? 0) > 0) {
      return failResult(
        `Bu kategoriye bağlı ${count} haber var. Silmek yerine kategoriyi pasifleştirin.`,
      );
    }

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", parsed);

    if (error) {
      return dbFail("delete", error.message);
    }

    await writeAuditLog(supabase, {
      actorId: user.id,
      action: "category.delete",
      entityType: "category",
      entityId: parsed,
      beforeData: snapshotCategory(current),
      afterData: null,
    });

    revalidateCategoryPaths(undefined, current.slug);
    return okResult({ id: parsed }, "Kategori silindi");
  } catch (error) {
    return toActionError(error);
  }
}
