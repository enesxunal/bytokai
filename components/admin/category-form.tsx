"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import {
  createCategory,
  updateCategory,
} from "@/app/admin/(protected)/categories/actions";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { DbCategory } from "@/lib/database/types";
import { slugifyTurkish } from "@/lib/utils/slug";

const categoryFormSchema = z.object({
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
  description: z.string().trim().max(2000),
  color: z
    .string()
    .trim()
    .min(1, "Renk gerekli")
    .max(32, "Renk değeri çok uzun")
    .regex(
      /^(#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?|[a-zA-Z][a-zA-Z0-9_-]*)$/,
      "Renk #RGB / #RRGGBB veya güvenli metin olmalı",
    ),
  theme: z
    .string()
    .trim()
    .min(1, "Tema gerekli")
    .max(64, "Tema çok uzun")
    .regex(
      /^[a-zA-Z0-9]+(?:[-_][a-zA-Z0-9]+)*$/,
      "Tema yalnızca harf, rakam, tire ve alt çizgi içerebilir",
    ),
  sort_order: z
    .number({ message: "Sıralama sayı olmalı" })
    .int("Sıralama tam sayı olmalı")
    .min(0, "Sıralama en az 0 olmalı")
    .max(10_000, "Sıralama en fazla 10000 olabilir"),
  active: z.boolean(),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

type CategoryFormProps = {
  mode: "create" | "edit";
  category?: DbCategory;
};

export function CategoryForm({ mode, category }: CategoryFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: category?.name ?? "",
      slug: category?.slug ?? "",
      description: category?.description ?? "",
      color: category?.color ?? "#6366f1",
      theme: category?.theme ?? "default",
      sort_order: category?.sort_order ?? 0,
      active: category?.active ?? true,
    },
  });

  function onSubmit(values: CategoryFormValues) {
    startTransition(async () => {
      const result =
        mode === "edit" && category
          ? await updateCategory({ id: category.id, ...values })
          : await createCategory(values);

      if (!result.ok) {
        toast.error(result.message ?? "Kayıt başarısız");
        if (result.fieldErrors) {
          for (const [key, messages] of Object.entries(result.fieldErrors)) {
            form.setError(key as keyof CategoryFormValues, {
              message: messages[0],
            });
          }
        }
        return;
      }

      toast.success(result.message ?? "Kaydedildi");
      router.push(`/admin/categories/${result.data.id}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">
          {mode === "create" ? "Yeni kategori" : "Kategoriyi düzenle"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Haber kategorilerinin ad, slug, renk, tema ve sıralamasını yönetin.
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
                            slugifyTurkish(event.target.value) || "kategori",
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
                    Public kategori sayfası kimliği (`/kategori/...`).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Açıklama</FormLabel>
                <FormControl>
                  <Textarea {...field} disabled={pending} rows={4} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Renk</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Input
                        {...field}
                        disabled={pending}
                        className="font-mono"
                        placeholder="#6366f1"
                      />
                      <span
                        className="size-9 shrink-0 rounded-md border border-border"
                        style={{
                          backgroundColor: /^#[0-9A-Fa-f]{3,8}$/.test(
                            field.value,
                          )
                            ? field.value
                            : "transparent",
                        }}
                        aria-hidden
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Hex (`#RGB` / `#RRGGBB`) veya güvenli metin.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="theme"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tema</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={pending}
                      className="font-mono"
                      placeholder="default"
                    />
                  </FormControl>
                  <FormDescription>
                    Örn. `ai`, `developer`, `business`.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="sort_order"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sıralama</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={10_000}
                    step={1}
                    disabled={pending}
                    value={Number.isFinite(field.value) ? field.value : ""}
                    onChange={(event) => {
                      const raw = event.target.value;
                      if (raw === "") {
                        field.onChange(Number.NaN);
                        return;
                      }
                      field.onChange(Number.parseInt(raw, 10));
                    }}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </FormControl>
                <FormDescription>
                  Küçük değerler listede üstte görünür. Aynı değere izin verilir.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="active"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-md border border-border px-3 py-3">
                <div className="space-y-0.5">
                  <FormLabel>Aktif</FormLabel>
                  <FormDescription>
                    Pasif kategoriler public menüde ve atamada görünmez.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={pending}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" disabled={pending}>
              {mode === "create" ? "Oluştur" : "Kaydet"}
            </Button>
            <Button type="button" variant="outline" asChild disabled={pending}>
              <Link
                href={
                  mode === "edit" && category
                    ? `/admin/categories/${category.id}`
                    : "/admin/categories"
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
