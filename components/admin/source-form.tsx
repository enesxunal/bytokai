"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import {
  createSource,
  updateSource,
} from "@/app/admin/(protected)/sources/actions";
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
import type { DbSource } from "@/lib/database/types";
import { slugifyTurkish } from "@/lib/utils/slug";

const INGESTION_TYPES = ["rss", "html", "manual"] as const;

const INGESTION_TYPE_LABELS: Record<(typeof INGESTION_TYPES)[number], string> = {
  rss: "RSS",
  html: "HTML",
  manual: "Manuel",
};

const sourceFormSchema = z.object({
  name: z.string().trim().min(1, "Ad gerekli").max(200),
  slug: z
    .string()
    .trim()
    .min(1, "Slug gerekli")
    .max(120)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug yalnızca küçük harf, rakam ve tire içerebilir",
    ),
  homepage_url: z
    .string()
    .trim()
    .min(1, "Ana site URL gerekli")
    .max(2000)
    .refine((value) => /^https?:\/\//i.test(value), {
      message: "URL http:// veya https:// ile başlamalı",
    }),
  section_url: z
    .string()
    .trim()
    .min(1, "Bölüm URL gerekli")
    .max(2000)
    .refine((value) => /^https?:\/\//i.test(value), {
      message: "URL http:// veya https:// ile başlamalı",
    }),
  feed_url: z
    .string()
    .trim()
    .max(2000)
    .refine((value) => !value || /^https?:\/\//i.test(value), {
      message: "Feed URL http:// veya https:// ile başlamalı",
    }),
  ingestion_type: z.enum(["rss", "html", "manual"]),
  enabled: z.boolean(),
  priority: z
    .number({ message: "Öncelik sayı olmalı" })
    .int("Öncelik tam sayı olmalı")
    .min(1, "Öncelik en az 1 olmalı")
    .max(10_000, "Öncelik en fazla 10000 olabilir"),
  default_language: z
    .string()
    .trim()
    .min(2, "Dil kodu gerekli")
    .max(16)
    .regex(/^[a-z]{2}(-[A-Za-z]{2})?$/, "Dil kodu örn. en veya tr olmalı"),
});

type SourceFormValues = z.infer<typeof sourceFormSchema>;

type SourceFormProps = {
  mode: "create" | "edit";
  source?: DbSource;
};

export function SourceForm({ mode, source }: SourceFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<SourceFormValues>({
    resolver: zodResolver(sourceFormSchema),
    defaultValues: {
      name: source?.name ?? "",
      slug: source?.slug ?? "",
      homepage_url: source?.homepage_url ?? "",
      section_url: source?.section_url ?? "",
      feed_url: source?.feed_url ?? "",
      ingestion_type: source?.ingestion_type ?? "rss",
      enabled: source?.enabled ?? true,
      priority: source?.priority ?? 100,
      default_language: source?.default_language ?? "en",
    },
  });

  function onSubmit(values: SourceFormValues) {
    startTransition(async () => {
      const result =
        mode === "edit" && source
          ? await updateSource({ id: source.id, ...values })
          : await createSource(values);

      if (!result.ok) {
        toast.error(result.message ?? "Kayıt başarısız");
        if (result.fieldErrors) {
          for (const [key, messages] of Object.entries(result.fieldErrors)) {
            form.setError(key as keyof SourceFormValues, {
              message: messages[0],
            });
          }
        }
        return;
      }

      toast.success(result.message ?? "Kaydedildi");
      router.push(`/admin/sources/${result.data.id}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">
          {mode === "create" ? "Yeni kaynak" : "Kaynağı düzenle"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Kaynak bilgilerini girin. URL’ler http/https olmalı; slug küçük harf,
          rakam ve tire içermelidir.
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-5 rounded-lg border border-border bg-card/40 p-4 sm:p-6"
        >
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
                          slugifyTurkish(event.target.value) || "kaynak",
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
                  URL kimliği. Ad alanından otomatik önerilir.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="homepage_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ana site URL</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={pending}
                      placeholder="https://example.com/"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="section_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bölüm URL</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={pending}
                      placeholder="https://example.com/ai/"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="feed_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Feed URL</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    disabled={pending}
                    placeholder="https://example.com/feed/"
                  />
                </FormControl>
                <FormDescription>RSS için zorunlu önerilir; HTML/manuel için boş bırakılabilir.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-5 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="ingestion_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ingestion türü</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      disabled={pending}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    >
                      {INGESTION_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {INGESTION_TYPE_LABELS[type]}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Öncelik</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={10000}
                      value={field.value}
                      disabled={pending}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                      onChange={(event) => {
                        const next = event.target.valueAsNumber;
                        field.onChange(
                          Number.isFinite(next) ? next : event.target.value,
                        );
                      }}
                    />
                  </FormControl>
                  <FormDescription>Düşük sayı = daha yüksek öncelik</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="default_language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Varsayılan dil</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={pending}
                      placeholder="en"
                      className="font-mono"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="enabled"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-md border border-border px-3 py-3">
                <div className="space-y-0.5">
                  <FormLabel>Aktif</FormLabel>
                  <FormDescription>
                    Pasif kaynaklar otomatik ingestion’a dahil edilmez.
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
                  mode === "edit" && source
                    ? `/admin/sources/${source.id}`
                    : "/admin/sources"
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
