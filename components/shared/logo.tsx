import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils/cn";

type LogoProps = {
  className?: string;
  href?: string | null;
  size?: "sm" | "md" | "lg";
  /** Prefer horizontal wordmark image; set false for text-only mark. */
  wordmark?: boolean;
};

/** Intrinsic logo aspect: 1600×420 */
const LOGO_ASPECT = 1600 / 420;

const imageHeights = {
  sm: 30,
  md: 36,
  lg: 40,
} as const;

const textSizes = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-3xl",
} as const;

/** CSS heights: mobile ~30–34px, desktop ~34–40px */
const imageClass = {
  sm: "h-[30px] w-auto",
  md: "h-[32px] w-auto sm:h-[36px] lg:h-[38px]",
  lg: "h-[36px] w-auto sm:h-[40px]",
} as const;

export function Logo({
  className,
  href = "/",
  size = "md",
  wordmark = true,
}: LogoProps) {
  const height = imageHeights[size];
  const width = Math.round(height * LOGO_ASPECT);

  const content = wordmark ? (
    <Image
      src="/bytok-ai.png"
      alt="BYTOK AI"
      width={width}
      height={height}
      className={cn(imageClass[size], "object-contain object-left", className)}
      priority
      sizes="(max-width: 640px) 122px, 145px"
    />
  ) : (
    <span
      className={cn(
        "inline-flex items-center font-serif font-semibold tracking-tight text-foreground",
        textSizes[size],
        className,
      )}
    >
      BYTOK <span className="text-primary">AI</span>
    </span>
  );

  if (!href) {
    return content;
  }

  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center"
      aria-label="BYTOK AI ana sayfa"
    >
      {content}
    </Link>
  );
}
