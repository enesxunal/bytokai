import type { LucideIcon } from "lucide-react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

type ErrorStateProps = {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
};

export function ErrorState({
  title = "Bir şeyler ters gitti",
  description = "İçerik yüklenirken bir hata oluştu. Lütfen tekrar deneyin.",
  icon: Icon = AlertTriangle,
  retryLabel = "Yeniden dene",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-16 text-center",
        className,
      )}
      role="alert"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <h3 className="font-serif text-xl font-semibold tracking-tight">
        {title}
      </h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {description}
      </p>
      {onRetry ? (
        <Button className="mt-6" variant="outline" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
