"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { subscribeNewsletter } from "@/app/actions/newsletter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";

type NewsletterFormProps = {
  className?: string;
  id?: string;
};

export function NewsletterForm({
  className,
  id = "newsletter-email",
}: NewsletterFormProps) {
  const [email, setEmail] = React.useState("");
  const [pending, setPending] = React.useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);

    try {
      const result = await subscribeNewsletter(email);
      if (result.ok) {
        toast.success(result.message);
        setEmail("");
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Kayıt sırasında bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className={cn("flex w-full flex-col gap-3 sm:flex-row sm:items-end", className)}
    >
      <div className="flex-1 space-y-2">
        <Label htmlFor={id} className="sr-only">
          E-posta adresi
        </Label>
        <Input
          id={id}
          type="email"
          name="email"
          autoComplete="email"
          required
          placeholder="ornek@eposta.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={pending}
        />
      </div>
      <Button type="submit" variant="brand" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Kaydediliyor…
          </>
        ) : (
          "Abone ol"
        )}
      </Button>
    </form>
  );
}
