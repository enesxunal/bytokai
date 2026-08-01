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

const imageHeights = {
  sm: 32,
  md: 44,
  lg: 52,
} as const;

const textSizes = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-3xl",
} as const;

const imageClass = {
  sm: "h-8 w-auto",
  md: "h-10 w-auto sm:h-11",
  lg: "h-12 w-auto",
} as const;

export function Logo({
  className,
  href = "/",
  size = "md",
  wordmark = true,
}: LogoProps) {
  const height = imageHeights[size];
  const width = Math.round(height * (1600 / 420));

  const content = wordmark ? (
    <Image
      src="/bytok-ai.png"
      alt="BYTOK AI"
      width={width}
      height={height}
      className={cn(imageClass[size], className)}
      priority
    />
  ) : (
    <span
      className={cn(
        "inline-flex items-center font-serif font-semibold tracking-tight text-foreground",
        textSizes[size],
        className,
      )}
    >
      BYTOK <span className="text-gradient-brand">AI</span>
    </span>
  );

  if (!href) {
    return content;
  }

  return (
    <Link
      href={href}
      className="inline-flex items-center transition-opacity hover:opacity-90"
      aria-label="BYTOK AI ana sayfa"
    >
      {content}
    </Link>
  );
}
