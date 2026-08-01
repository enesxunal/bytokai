import { Container } from "@/components/shared/container";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <main>
      <Container className="space-y-12 py-8 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <Skeleton className="aspect-[16/10] w-full rounded-2xl sm:aspect-[21/10]" />
          <div className="space-y-4 rounded-2xl border border-border p-5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
        <div>
          <Skeleton className="mb-6 h-8 w-48" />
          <LoadingSkeleton variant="grid" count={4} />
        </div>
      </Container>
    </main>
  );
}
