import { cn } from "@/lib/utils/cn";

type ContainerProps = {
  as?: "div" | "section" | "article" | "main" | "header" | "footer";
  size?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
  children: React.ReactNode;
};

const sizeClasses = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
  full: "max-w-none",
} as const;

export function Container({
  as: Comp = "div",
  size = "xl",
  className,
  children,
}: ContainerProps) {
  return (
    <Comp
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        sizeClasses[size],
        className,
      )}
    >
      {children}
    </Comp>
  );
}
