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
import { parseExpertiseInput } from "@/lib/admin/authors";
import { requireAdminAction } from "@/lib/auth/session";
import type { DbAuthor } from "@/lib/database/types";
import { createLogger } from "@/lib/utils/logger";
import { generateUniqueSlug, slugifyTurkish } from "@/lib/utils/slug";

const logger = createLogger("admin.author-actions");

const uuidSchema = z.string().uuid("Geçersiz yazar kimliği");

const authorInputSchema = z.object({
  name: z.string().trim().min(1, "İsim gerekli").max(120),
  slug: z
    .string()
    .trim()
    .min(1, "Slug gerekli")
    .max(120)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug yalnızca küçük harf, rakam ve tire içerebilir",
    ),
  role: z.string().trim().min(1, "Rol gerekli").max(120),
  short_bio: z.string().trim().max(500),
  full_bio: z.string().trim().max(10_000),
  expertise: z.string().max(2000),
  tone: z.string().trim().max(500),
  writing_rules: z.string().max(20_000),
  system_prompt: z.string().max(50_000),
  avatar_seed: z.string().trim().max(120),
  active: z.boolean(),
});

const updateAuthorSchema = authorInputSchema.extend({
  id: uuidSchema,
});

export type AuthorFormInput = z.infer<typeof authorInputSchema>;
export type UpdateAuthorInput = z.infer<typeof updateAuthorSchema>;

function dbFail(action: string, reason: string): ActionResult<never> {
  logger.error("Yazar işlemi başarısız", { action, reason });
  return failResult("İşlem tamamlanamadı. Lütfen tekrar deneyin.");
}

function snapshotAuthor(author: DbAuthor): Record<string, unknown> {
  return {
    id: author.id,
    name: author.name,
    slug: author.slug,
    role: author.role,
    short_bio: author.short_bio,
    full_bio: author.full_bio,
    expertise: author.expertise,
    tone: author.tone,
    writing_rules: author.writing_rules,
    system_prompt: author.system_prompt,
    avatar_seed: author.avatar_seed,
    active: author.active,
  };
}

function revalidateAuthorPaths(id?: string, slug?: string | null) {
  revalidatePath("/admin/authors");
  if (id) {
    revalidatePath(`/admin/authors/${id}`);
    revalidatePath(`/admin/authors/${id}/edit`);
  }
  if (slug) {
    revalidatePath(`/yazar/${slug}`);
  }
  revalidatePath("/admin");
}

async function fetchAuthor(
  supabase: Awaited<ReturnType<typeof requireAdminAction>>["supabase"],
  id: string,
): Promise<{ author: DbAuthor | null; error: string | null }> {
  const { data, error } = await supabase
    .from("authors")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return { author: null, error: error.message };
  }

  return { author: (data as DbAuthor | null) ?? null, error: null };
}

function valuesEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function toAuthorPayload(parsed: AuthorFormInput) {
  const expertise = parseExpertiseInput(parsed.expertise);
  const avatarSeed =
    parsed.avatar_seed.trim() || slugifyTurkish(parsed.name) || "author";

  return {
    name: parsed.name,
    slug: parsed.slug,
    role: parsed.role,
    short_bio: parsed.short_bio,
    full_bio: parsed.full_bio,
    expertise,
    tone: parsed.tone,
    writing_rules: parsed.writing_rules,
    system_prompt: parsed.system_prompt,
    avatar_seed: avatarSeed,
    active: parsed.active,
  };
}

export async function createAuthor(
  input: AuthorFormInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = authorInputSchema.parse(input);
    const { user, supabase } = await requireAdminAction();

    const { data: slugConflict } = await supabase
      .from("authors")
      .select("id")
      .eq("slug", parsed.slug)
      .maybeSingle();

    if (slugConflict) {
      return failResult("Bu slug zaten kullanılıyor", {
        slug: ["Bu slug zaten kullanılıyor"],
      });
    }

    const payload = toAuthorPayload(parsed);

    const { data, error } = await supabase
      .from("authors")
      .insert(payload)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return dbFail("create", error?.message ?? "insert failed");
    }

    const created = data as DbAuthor;

    await writeAuditLog(supabase, {
      actorId: user.id,
      action: "author.create",
      entityType: "author",
      entityId: created.id,
      beforeData: null,
      afterData: snapshotAuthor(created),
    });

    revalidateAuthorPaths(created.id, created.slug);
    return okResult({ id: created.id }, "Yazar personası oluşturuldu");
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateAuthor(
  input: UpdateAuthorInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = updateAuthorSchema.parse(input);
    const { user, supabase } = await requireAdminAction();
    const fetched = await fetchAuthor(supabase, parsed.id);
    if (fetched.error) return dbFail("update.fetch", fetched.error);
    const current = fetched.author;

    if (!current) {
      return failResult("Yazar bulunamadı");
    }

    if (parsed.slug !== current.slug) {
      const { data: slugConflict } = await supabase
        .from("authors")
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

    const nextPatch = toAuthorPayload(parsed);

    const currentComparable = {
      name: current.name,
      slug: current.slug,
      role: current.role,
      short_bio: current.short_bio,
      full_bio: current.full_bio,
      expertise: current.expertise,
      tone: current.tone,
      writing_rules: current.writing_rules,
      system_prompt: current.system_prompt,
      avatar_seed: current.avatar_seed,
      active: current.active,
    };

    if (valuesEqual(currentComparable, nextPatch)) {
      return okResult({ id: parsed.id }, "Değişiklik yok");
    }

    const { data, error } = await supabase
      .from("authors")
      .update(nextPatch)
      .eq("id", parsed.id)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return dbFail("update", error?.message ?? "update failed");
    }

    const updated = data as DbAuthor;

    await writeAuditLog(supabase, {
      actorId: user.id,
      action: "author.update",
      entityType: "author",
      entityId: parsed.id,
      beforeData: snapshotAuthor(current),
      afterData: snapshotAuthor(updated),
    });

    revalidateAuthorPaths(parsed.id, updated.slug);
    if (current.slug !== updated.slug) {
      revalidatePath(`/yazar/${current.slug}`);
    }

    return okResult({ id: parsed.id }, "Yazar personası kaydedildi");
  } catch (error) {
    return toActionError(error);
  }
}

export async function setAuthorActive(
  id: string,
  active: boolean,
): Promise<ActionResult<{ id: string; active: boolean }>> {
  try {
    const parsed = uuidSchema.parse(id);
    const activeFlag = z.boolean().parse(active);
    const { user, supabase } = await requireAdminAction();
    const fetched = await fetchAuthor(supabase, parsed);
    if (fetched.error) return dbFail("setActive.fetch", fetched.error);
    const current = fetched.author;

    if (!current) {
      return failResult("Yazar bulunamadı");
    }

    if (current.active === activeFlag) {
      return okResult(
        { id: parsed, active: activeFlag },
        activeFlag ? "Persona zaten aktif" : "Persona zaten pasif",
      );
    }

    const { data, error } = await supabase
      .from("authors")
      .update({ active: activeFlag })
      .eq("id", parsed)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return dbFail("setActive", error?.message ?? "update failed");
    }

    await writeAuditLog(supabase, {
      actorId: user.id,
      action: activeFlag ? "author.enable" : "author.disable",
      entityType: "author",
      entityId: parsed,
      beforeData: snapshotAuthor(current),
      afterData: snapshotAuthor(data as DbAuthor),
    });

    revalidateAuthorPaths(parsed, current.slug);
    return okResult(
      { id: parsed, active: activeFlag },
      activeFlag ? "Persona aktifleştirildi" : "Persona pasifleştirildi",
    );
  } catch (error) {
    return toActionError(error);
  }
}

export async function duplicateAuthor(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = uuidSchema.parse(id);
    const { user, supabase } = await requireAdminAction();
    const fetched = await fetchAuthor(supabase, parsed);
    if (fetched.error) return dbFail("duplicate.fetch", fetched.error);
    const current = fetched.author;

    if (!current) {
      return failResult("Yazar bulunamadı");
    }

    const draftName = `${current.name} (Kopya)`.slice(0, 120);
    const draftSlug = await generateUniqueSlug(
      `${current.slug}-kopya`,
      async (slug) => {
        const { data } = await supabase
          .from("authors")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();
        return Boolean(data);
      },
    );

    const payload = {
      name: draftName,
      slug: draftSlug,
      role: current.role,
      short_bio: current.short_bio,
      full_bio: current.full_bio,
      expertise: current.expertise,
      tone: current.tone,
      writing_rules: current.writing_rules,
      system_prompt: current.system_prompt,
      avatar_seed: `${current.avatar_seed || current.slug}-kopya`.slice(0, 120),
      active: false,
    };

    const { data, error } = await supabase
      .from("authors")
      .insert(payload)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return dbFail("duplicate", error?.message ?? "insert failed");
    }

    const created = data as DbAuthor;

    await writeAuditLog(supabase, {
      actorId: user.id,
      action: "author.duplicate",
      entityType: "author",
      entityId: created.id,
      beforeData: { source_id: current.id, source_slug: current.slug },
      afterData: snapshotAuthor(created),
    });

    revalidateAuthorPaths(created.id, created.slug);
    return okResult({ id: created.id }, "Persona çoğaltıldı (pasif taslak)");
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteAuthor(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = uuidSchema.parse(id);
    const { user, supabase } = await requireAdminAction();
    const fetched = await fetchAuthor(supabase, parsed);
    if (fetched.error) return dbFail("delete.fetch", fetched.error);
    const current = fetched.author;

    if (!current) {
      return okResult({ id: parsed }, "Yazar zaten silinmiş");
    }

    const { count, error: countError } = await supabase
      .from("articles")
      .select("id", { count: "exact", head: true })
      .eq("author_id", parsed);

    if (countError) {
      return dbFail("delete.count", countError.message);
    }

    if ((count ?? 0) > 0) {
      return failResult(
        `Bu yazara bağlı ${count} haber var. Silmek yerine personayı pasifleştirin.`,
      );
    }

    const { error } = await supabase.from("authors").delete().eq("id", parsed);

    if (error) {
      return dbFail("delete", error.message);
    }

    await writeAuditLog(supabase, {
      actorId: user.id,
      action: "author.delete",
      entityType: "author",
      entityId: parsed,
      beforeData: snapshotAuthor(current),
      afterData: null,
    });

    revalidateAuthorPaths(undefined, current.slug);
    return okResult({ id: parsed }, "Yazar personası silindi");
  } catch (error) {
    return toActionError(error);
  }
}
