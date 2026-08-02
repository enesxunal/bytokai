"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import {
  createRawArticle,
  type CreateRawArticleInput,
} from "@/app/admin/(protected)/raw-articles/actions";
import { CoverImageField } from "@/components/admin/cover-image-field";
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
import type { AdminRawArticleFilterOptions } from "@/lib/admin/raw-articles";

const formSchema = z.object({
  sourceId: z.string().uuid("Kaynak seçin"),
  originalTitle: z.string().trim().min(1, "Başlık gerekli").max(500),
  originalUrl: z.string().trim().max(2000),
  originalExcerpt: z.string().trim().max(4000),
  originalAuthor: z.string().trim().max(200),
  rawContent: z.string().trim().max(200_000),
  originalImageUrl: z.string().trim().max(2000),
  queueForProcessing: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

export function RawArticleCreateForm({
  options,
}: {
  options: AdminRawArticleFilterOptions;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sourceId: options.sources[0]?.id ?? "",
      originalTitle: "",
      originalUrl: "",
      originalExcerpt: "",
      originalAuthor: "",
      rawContent: "",
      originalImageUrl: "",
      queueForProcessing: true,
    },
  });

  function onSubmit(values: FormValues) {
    if (
      values.originalUrl &&
      !/^https?:\/\//i.test(values.originalUrl)
    ) {
      form.setError("originalUrl", {
        message: "URL http:// veya https:// ile başlamalı",
      });
      return;
    }
    if (
      values.originalImageUrl &&
      !(
        values.originalImageUrl.startsWith("/") ||
        /^https?:\/\//i.test(values.originalImageUrl)
      )
    ) {
      form.setError("originalImageUrl", {
        message: "Görsel URL geçerli olmalı",
      });
      return;
    }

    const payload: CreateRawArticleInput = values;

    startTransition(async () => {
      const result = await createRawArticle(payload);
      if (result.ok) {
        toast.success(result.message ?? "Ham haber oluşturuldu");
        router.push(`/admin/raw-articles/${result.data.id}`);
        router.refresh();
        return;
      }

      if (result.fieldErrors) {
        for (const [key, messages] of Object.entries(result.fieldErrors)) {
          if (key in values) {
            form.setError(key as keyof FormValues, {
              message: messages[0],
            });
          }
        }
      }
      toast.error(result.message ?? "Kayıt başarısız");
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-sans text-2xl font-semibold tracking-tight">
            Yeni ham haber
          </h1>
          <p className="text-sm text-muted-foreground">
            Kaynak içeriğini elle ekleyin. İsterseniz AI işlem kuyruğuna alın.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/raw-articles">Listeye dön</Link>
        </Button>
      </div>

      {options.sources.length === 0 ? (
        <div className="rounded-lg border border-border bg-card/40 p-4 text-sm text-muted-foreground">
          Önce bir kaynak tanımlamanız gerekir.{" "}
          <Link
            href="/admin/sources/new"
            className="font-medium text-primary hover:underline"
          >
            Yeni kaynak ekle
          </Link>
        </div>
      ) : null}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <FormField
              control={form.control}
              name="sourceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kaynak</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      disabled={pending || options.sources.length === 0}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    >
                      <option value="">Kaynak seçin</option>
                      {options.sources.map((source) => (
                        <option key={source.id} value={source.id}>
                          {source.name}
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
              name="originalAuthor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Orijinal yazar</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={pending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="originalTitle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Başlık</FormLabel>
                <FormControl>
                  <Input {...field} disabled={pending} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="originalUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kaynak URL</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    disabled={pending}
                    placeholder="https://… (boş bırakılırsa otomatik üretilir)"
                  />
                </FormControl>
                <FormDescription>
                  Boş bırakırsanız sistem benzersiz bir manuel URL üretir.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="originalExcerpt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Özet</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={3} disabled={pending} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="rawContent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ham içerik</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={12}
                    disabled={pending}
                    className="font-mono text-xs"
                  />
                </FormControl>
                <FormDescription>
                  AI işlemi için mümkün olduğunca tam metin ekleyin.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="originalImageUrl"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <CoverImageField
                    id="raw-cover-image"
                    label="Görsel"
                    value={field.value}
                    onChange={field.onChange}
                    disabled={pending}
                    error={form.formState.errors.originalImageUrl?.message}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="queueForProcessing"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3 space-y-0 rounded-lg border border-border p-4">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={pending}
                  />
                </FormControl>
                <div className="space-y-0.5">
                  <FormLabel className="!mt-0">AI işlem kuyruğuna al</FormLabel>
                  <FormDescription>
                    Açıkken kayıt “Bekliyor” durumuna düşer ve otomatik haber
                    üretimine girer.
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              disabled={pending || options.sources.length === 0}
            >
              {pending ? "Kaydediliyor…" : "Ham haberi kaydet"}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/raw-articles">İptal</Link>
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
