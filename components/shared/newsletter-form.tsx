"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { subscribeNewsletter } from "@/app/actions/newsletter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";

type NewsletterFormProps = {
  className?: string;
  id?: string;
  /** Use light controls on dark brand surfaces */
  tone?: "default" | "on-brand";
};

export function NewsletterForm({
  className,
  id = "newsletter-email",
  tone = "default",
}: NewsletterFormProps) {
  const [email, setEmail] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [status, setStatus] = React.useState<
    null | { type: "success" | "error"; message: string }
  >(null);
  const statusId = `${id}-status`;
  const onBrand = tone === "on-brand";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setStatus(null);

    try {
      const result = await subscribeNewsletter(email);
      if (result.ok) {
        setStatus({ type: "success", message: result.message });
        setEmail("");
      } else {
        setStatus({ type: "error", message: result.message });
      }
    } catch {
      setStatus({
        type: "error",
        message: "Kayıt sırasında bir hata oluştu. Lütfen tekrar deneyin.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className={cn("w-full space-y-3", className)}
      noValidate
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label
            htmlFor={id}
            className={cn(
              "text-sm font-medium",
              onBrand ? "text-white/85" : "text-foreground",
            )}
          >
            E-posta adresi
          </Label>
          <Input
            id={id}
            type="email"
            name="email"
            autoComplete="email"
            required
            inputMode="email"
            placeholder="ornek@eposta.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
            aria-describedby={status ? statusId : undefined}
            aria-invalid={status?.type === "error" ? true : undefined}
            className={cn(
              "h-11",
              onBrand &&
                "border-white/20 bg-white/10 text-white placeholder:text-white/45 focus-visible:ring-white/40",
            )}
          />
        </div>
        <Button
          type="submit"
          disabled={pending}
          className={cn(
            "h-11 w-full shrink-0 sm:w-auto sm:min-w-[9.5rem]",
            onBrand
              ? "bg-white text-[#0b1220] hover:bg-white/90"
              : undefined,
          )}
          variant={onBrand ? "secondary" : "default"}
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Kaydediliyor…
            </>
          ) : (
            "Bültene katıl"
          )}
        </Button>
      </div>

      <p
        className={cn(
          "text-xs leading-relaxed",
          onBrand ? "text-white/65" : "text-muted-foreground",
        )}
      >
        Abonelikten dilediğiniz zaman ayrılabilirsiniz.{" "}
        <Link
          href="/gizlilik"
          className={cn(
            "underline underline-offset-2",
            onBrand ? "text-white/85 hover:text-white" : "hover:text-foreground",
          )}
        >
          Gizlilik
        </Link>
      </p>

      <div
        id={statusId}
        role="status"
        aria-live="polite"
        className="min-h-[1.25rem] text-sm"
      >
        {status ? (
          <p
            className={cn(
              status.type === "success"
                ? onBrand
                  ? "text-emerald-200"
                  : "text-success"
                : onBrand
                  ? "text-red-200"
                  : "text-destructive",
            )}
          >
            {status.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
