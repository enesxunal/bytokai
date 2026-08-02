import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils/cn";

type LogoProps = {
  className?: string;
  href?: string | null;
  size?: "sm" | "md" | "lg";
  /** Prefer horizontal wordmark image; set false for text-only mark. */
  wordmark?: boolean;
  /** Only the header LCP logo should stay priority. */
  priority?: boolean;
};

/** Intrinsic logo aspect: 1600×420 */
const LOGO_ASPECT = 1600 / 420;

const imageHeights = {
  sm: 34,
  md: 46,
  lg: 52,
} as const;

const textSizes = {
  sm: "text-xl",
  md: "text-3xl",
  lg: "text-4xl",
} as const;

/** CSS heights: mobile ~40px, desktop ~46–48px */
const imageClass = {
  sm: "h-[34px] w-auto",
  md: "h-[40px] w-auto sm:h-[44px] lg:h-[48px]",
  lg: "h-[44px] w-auto sm:h-[48px] lg:h-[52px]",
} as const;

export function Logo({
  className,
  href = "/",
  size = "md",
  wordmark = true,
  priority = false,
}: LogoProps) {
  const height = imageHeights[size];
  const width = Math.round(height * LOGO_ASPECT);

  const content = wordmark ? (
    <span className={cn("relative inline-flex items-center", className)}>
      {/* Light theme: dark wordmark */}
      <Image
        src="/bytok-ai-on-light.png"
        alt="BYTOK AI"
        width={width}
        height={height}
        className={cn(imageClass[size], "object-contain object-left dark:hidden")}
        priority={priority}
        sizes="(max-width: 640px) 152px, 183px"
      />
      {/* Dark theme: white wordmark */}
      <Image
        src="/bytok-ai-on-dark.png"
        alt=""
        aria-hidden
        width={width}
        height={height}
        className={cn(
          imageClass[size],
          "hidden object-contain object-left dark:block",
        )}
        priority={priority}
        sizes="(max-width: 640px) 152px, 183px"
      />
    </span>
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
