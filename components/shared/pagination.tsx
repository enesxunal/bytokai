import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

type PaginationProps = {
  page: number;
  totalPages: number;
  basePath?: string;
  className?: string;
};

function buildHref(basePath: string, page: number) {
  if (page <= 1) return basePath;
  const separator = basePath.includes("?") ? "&" : "?";
  return `${basePath}${separator}sayfa=${page}`;
}

export function Pagination({
  page,
  totalPages,
  basePath = "/",
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const prev = page > 1 ? page - 1 : null;
  const next = page < totalPages ? page + 1 : null;

  return (
    <nav
      className={cn("flex items-center justify-between gap-4", className)}
      aria-label="Sayfalama"
    >
      {prev ? (
        <Button variant="outline" size="sm" asChild>
          <Link href={buildHref(basePath, prev)}>
            <ChevronLeft className="h-4 w-4" />
            Önceki
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          <ChevronLeft className="h-4 w-4" />
          Önceki
        </Button>
      )}

      <p className="text-sm text-muted-foreground">
        Sayfa{" "}
        <span className="font-medium text-foreground">{page}</span> /{" "}
        {totalPages}
      </p>

      {next ? (
        <Button variant="outline" size="sm" asChild>
          <Link href={buildHref(basePath, next)}>
            Sonraki
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          Sonraki
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </nav>
  );
}
