"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

type LoadMoreButtonProps = {
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  hasMore?: boolean;
  label?: string;
  loadingLabel?: string;
  className?: string;
};

export function LoadMoreButton({
  onClick,
  loading = false,
  disabled = false,
  hasMore = true,
  label = "Daha fazla yükle",
  loadingLabel = "Yükleniyor…",
  className,
}: LoadMoreButtonProps) {
  if (!hasMore) return null;

  return (
    <div className={cn("flex justify-center", className)}>
      <Button
        variant="outline"
        size="lg"
        onClick={onClick}
        disabled={disabled || loading}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {loadingLabel}
          </>
        ) : (
          label
        )}
      </Button>
    </div>
  );
}
