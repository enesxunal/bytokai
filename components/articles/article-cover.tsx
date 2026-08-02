"use client";

import Image from "next/image";
import { useState } from "react";

import {
  coverClassForCategory,
  isLikelyCoverImageUrl,
} from "@/lib/covers/validate";
import { cn } from "@/lib/utils/cn";

type ArticleCoverImageProps = {
  src?: string | null;
  categorySlug?: string | null;
  alt?: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  sizes?: string;
};

export function CoverPlaceholder({
  categorySlug,
  className,
}: {
  categorySlug?: string | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex h-full w-full items-end overflow-hidden p-4",
        coverClassForCategory(categorySlug),
        className,
      )}
      aria-hidden
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgb(255_255_255/0.1),transparent_45%)]" />
      <div className="relative h-1 w-16 rounded-full bg-white/70" />
    </div>
  );
}

/**
 * Kapak görseli; URL bozuksa veya yüklenemezse kategori placeholder'ına düşer.
 */
export function ArticleCoverImage({
  src,
  categorySlug,
  alt = "",
  className,
  imageClassName,
  priority = false,
  sizes = "(max-width: 768px) 100vw, 33vw",
}: ArticleCoverImageProps) {
  const usableSrc = isLikelyCoverImageUrl(src) ? src : null;
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(usableSrc) && !failed;

  if (!showImage) {
    return (
      <CoverPlaceholder categorySlug={categorySlug} className={className} />
    );
  }

  return (
    <Image
      src={usableSrc!}
      alt={alt}
      fill
      priority={priority}
      className={cn("object-cover", imageClassName, className)}
      sizes={sizes}
      onError={() => setFailed(true)}
    />
  );
}
