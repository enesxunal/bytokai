"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import {
  createTag,
  updateTag,
} from "@/app/admin/(protected)/tags/actions";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { DbTag } from "@/lib/database/types";
import { slugifyTurkish } from "@/lib/utils/slug";

const tagFormSchema = z.object({
  name: z.string().trim().min(1, "Ad gerekli").max(120),
  slug: z
    .string()
    .trim()
    .min(1, "Slug gerekli")
    .max(120)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug yalnızca küçük harf, rakam ve tire içerebilir",
    ),
});

type TagFormValues = z.infer<typeof tagFormSchema>;

type TagFormProps = {
  mode: "create" | "edit";
  tag?: DbTag;
};

export function TagForm({ mode, tag }: TagFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<TagFormValues>({
    resolver: zodResolver(tagFormSchema),
    defaultValues: {
      name: tag?.name ?? "",
      slug: tag?.slug ?? "",
    },
  });

  function onSubmit(values: TagFormValues) {
    startTransition(async () => {
      const result =
        mode === "edit" && tag
          ? await updateTag({ id: tag.id, ...values })
          : await createTag(values);

      if (!result.ok) {
        toast.error(result.message ?? "Kayıt başarısız");
        if (result.fieldErrors) {
          for (const [key, messages] of Object.entries(result.fieldErrors)) {
            form.setError(key as keyof TagFormValues, {
              message: messages[0],
            });
          }
        }
        return;
      }

      toast.success(result.message ?? "Kaydedildi");
      router.push(`/admin/tags/${result.data.id}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">
          {mode === "create" ? "Yeni etiket" : "Etiketi düzenle"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Haber etiketlerinin ad ve slug değerlerini yönetin.
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-5 rounded-lg border border-border bg-card/40 p-4 sm:p-6"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ad</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={pending}
                      onBlur={(event) => {
                        field.onBlur();
                        const currentSlug = form.getValues("slug");
                        if (!currentSlug && event.target.value.trim()) {
                          form.setValue(
                            "slug",
                            slugifyTurkish(event.target.value) || "etiket",
                            { shouldValidate: true },
                          );
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={pending} className="font-mono" />
                  </FormControl>
                  <FormDescription>
                    Public etiket sayfası kimliği (`/etiket/...`).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" disabled={pending}>
              {mode === "create" ? "Oluştur" : "Kaydet"}
            </Button>
            <Button type="button" variant="outline" asChild disabled={pending}>
              <Link
                href={
                  mode === "edit" && tag
                    ? `/admin/tags/${tag.id}`
                    : "/admin/tags"
                }
              >
                Vazgeç
              </Link>
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
