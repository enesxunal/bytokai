/** Client + server için kapak görseli rehberi (server-only import yok). */

export const COVER_IMAGE_GUIDANCE = {
  width: 1600,
  height: 900,
  aspectLabel: "16:9",
  minWidth: 1200,
  maxBytes: 4 * 1024 * 1024,
  accept: "image/jpeg,image/png,image/webp,image/gif",
  acceptLabel: "JPG, PNG, WebP veya GIF",
} as const;
