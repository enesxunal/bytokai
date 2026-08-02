import "server-only";

import { randomUUID } from "node:crypto";

import type { ActionResult } from "@/lib/admin/action-result";
import { failResult, okResult } from "@/lib/admin/action-result";
import {
  COVER_IMAGE_GUIDANCE,
} from "@/lib/admin/cover-image-constants";
import { createLogger } from "@/lib/utils/logger";
import type { createClient } from "@/lib/supabase/server";

const logger = createLogger("admin.cover-image");

export const ARTICLE_COVER_BUCKET = "article-covers";
export { COVER_IMAGE_GUIDANCE };

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function resolveMime(file: File): string | null {
  if (file.type && ALLOWED_MIME.has(file.type)) {
    return file.type;
  }

  const name = file.name.toLowerCase();
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";
  return null;
}

function buildStoragePath(mime: string): string {
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const ext = EXT_BY_MIME[mime] ?? "jpg";
  return `covers/${yyyy}/${mm}/${randomUUID()}.${ext}`;
}

type AdminSupabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Kapak görselini public bucket'a yükler ve herkese açık URL döner.
 * Çağıran tarafın requireAdminAction ile yetki doğrulaması yapmış olması gerekir.
 */
export async function uploadCoverImageFile(
  supabase: AdminSupabase,
  file: File,
): Promise<ActionResult<{ url: string; path: string }>> {
  if (!(file instanceof File) || file.size <= 0) {
    return failResult("Geçerli bir görsel dosyası seçin");
  }

  if (file.size > COVER_IMAGE_GUIDANCE.maxBytes) {
    return failResult(
      `Görsel en fazla ${COVER_IMAGE_GUIDANCE.maxBytes / (1024 * 1024)} MB olabilir`,
    );
  }

  const mime = resolveMime(file);
  if (!mime) {
    return failResult(
      `Desteklenen formatlar: ${COVER_IMAGE_GUIDANCE.acceptLabel}`,
    );
  }

  const path = buildStoragePath(mime);
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(ARTICLE_COVER_BUCKET)
    .upload(path, buffer, {
      contentType: mime,
      upsert: false,
      cacheControl: "31536000",
    });

  if (uploadError) {
    logger.error("Kapak görseli yükleme başarısız", {
      reason: uploadError.message,
    });
    return failResult(
      "Görsel yüklenemedi. Storage bucket hazır mı kontrol edin veya tekrar deneyin.",
    );
  }

  const { data } = supabase.storage
    .from(ARTICLE_COVER_BUCKET)
    .getPublicUrl(path);

  if (!data?.publicUrl) {
    return failResult("Görsel URL'si oluşturulamadı");
  }

  return okResult(
    { url: data.publicUrl, path },
    "Kapak görseli yüklendi",
  );
}
