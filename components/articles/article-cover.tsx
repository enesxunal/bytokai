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
  /** Alt-orta logo (kenara yapışık değil). */
  showLogo?: boolean;
  logoSize?: "sm" | "md" | "lg";
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

function CoverLogoMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const height = size === "lg" ? 38 : size === "sm" ? 16 : 24;
  const cropFactor = 0.78;
  const fullHeight = Math.round(height / cropFactor);
  const width = Math.round(fullHeight * (1600 / 420));
  const padY = size === "lg" ? 9 : size === "sm" ? 4 : 6;
  const padX = size === "lg" ? 12 : size === "sm" ? 6 : 8;

  const shellClass = cn(
    "pointer-events-none absolute left-1/2 z-[1] -translate-x-1/2 overflow-hidden rounded-md shadow-sm backdrop-blur-[1px]",
    size === "lg" && "bottom-4 sm:bottom-5",
    size === "md" && "bottom-3 sm:bottom-3.5",
    size === "sm" && "bottom-2",
  );

  const shellStyle = {
    width: width + padX * 2,
    height: height + padY * 2,
    paddingLeft: padX,
    paddingRight: padX,
    paddingTop: padY,
  } as const;

  const imgStyle = {
    width,
    height: fullHeight,
    maxWidth: "none",
  } as const;

  return (
    <>
      {/* Light theme: dark wordmark on light plate */}
      <div
        className={cn(shellClass, "bg-white/80 dark:hidden")}
        style={shellStyle}
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/bytok-ai-on-light.png"
          alt=""
          width={width}
          height={fullHeight}
          className="object-contain object-left-top"
          style={imgStyle}
          draggable={false}
        />
      </div>
      {/* Dark theme: light wordmark on dark plate */}
      <div
        className={cn(shellClass, "hidden bg-[#07111f]/72 dark:block")}
        style={shellStyle}
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/bytok-ai-on-dark.png"
          alt=""
          width={width}
          height={fullHeight}
          className="object-contain object-left-top"
          style={imgStyle}
          draggable={false}
        />
      </div>
    </>
  );
}

/**
 * Kapak görseli. Logo yalnızca alt ortada (CSS).
 * Eski sağ-alt damgaları kırpmak için görsel hafif büyütülür.
 */
export function ArticleCoverImage({
  src,
  categorySlug,
  alt = "",
  className,
  imageClassName,
  priority = false,
  sizes = "(max-width: 768px) 100vw, 33vw",
  showLogo = true,
  logoSize = "md",
}: ArticleCoverImageProps) {
  const usableSrc = isLikelyCoverImageUrl(src) ? src : null;
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(usableSrc) && !failed;

  if (!showImage) {
    return (
      <div className={cn("relative h-full w-full overflow-hidden", className)}>
        <CoverPlaceholder
          categorySlug={categorySlug}
          className="h-full w-full"
        />
        {showLogo ? <CoverLogoMark size={logoSize} /> : null}
      </div>
    );
  }

  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      <Image
        src={usableSrc!}
        alt={alt}
        fill
        priority={priority}
        className={cn(
          "object-cover object-left-top",
          // Crop baked corner stamps (bottom-right) off the frame
          showLogo && "origin-top-left scale-[1.18]",
          imageClassName,
        )}
        sizes={sizes}
        onError={() => setFailed(true)}
      />
      {showLogo ? <CoverLogoMark size={logoSize} /> : null}
    </div>
  );
}
