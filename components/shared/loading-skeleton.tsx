import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";

type LoadingSkeletonProps = {
  variant?: "article-card" | "article-list" | "article-detail" | "grid";
  count?: number;
  className?: string;
};

function ArticleCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/5" />
      </div>
    </div>
  );
}

function ArticleListSkeleton() {
  return (
    <div className="flex gap-4 border-b border-border py-5">
      <Skeleton className="hidden h-24 w-36 shrink-0 rounded-lg sm:block" />
      <div className="flex-1 space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </div>
  );
}

function ArticleDetailSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-4/5" />
      <div className="flex gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="aspect-[21/9] w-full rounded-xl" />
      <div className="space-y-3 pt-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

export function LoadingSkeleton({
  variant = "grid",
  count = 6,
  className,
}: LoadingSkeletonProps) {
  if (variant === "article-detail") {
    return (
      <div className={cn(className)}>
        <ArticleDetailSkeleton />
      </div>
    );
  }

  if (variant === "article-list") {
    return (
      <div className={cn("divide-y divide-border", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <ArticleListSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (variant === "article-card") {
    return (
      <div className={cn(className)}>
        <ArticleCardSkeleton />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-6 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <ArticleCardSkeleton key={i} />
      ))}
    </div>
  );
}
