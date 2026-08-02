"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, type Control } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import {
  updateArticle,
  type UpdateArticleInput,
} from "@/app/admin/(protected)/articles/actions";
import {
  EditorialLivePreview,
  EditorialMarkdownEditor,
  EditorialTitleInput,
} from "@/components/admin/article-editorial-fields";
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
import { ARTICLE_STATUS_LABELS } from "@/lib/admin/labels";
import type {
  AdminArticleFilterOptions,
  AdminArticleWithRelations,
} from "@/lib/admin/articles";
import type { DbArticleStatus } from "@/lib/database/types";
import {
  istanbulDatetimeLocalToUtcIso,
  utcIsoToIstanbulDatetimeLocal,
} from "@/lib/utils/date";
import { slugifyTurkish } from "@/lib/utils/slug";

const STATUS_OPTIONS: DbArticleStatus[] = [
  "draft",
  "needs_review",
  "scheduled",
  "published",
  "archived",
  "failed",
];

const editFormSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().trim().min(1, "Başlık gerekli").max(300),
    slug: z
      .string()
      .trim()
      .min(1, "Slug gerekli")
      .max(220)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug yalnızca küçük harf, rakam ve tire içerebilir",
      ),
    excerpt: z.string().trim().max(1000),
    contentMarkdown: z.string().max(200_000),
    categoryId: z.string(),
    authorId: z.string(),
    tags: z.string().max(2000),
    coverImageUrl: z.string().trim().max(2000),
    seoTitle: z.string().trim().max(120),
    seoDescription: z.string().trim().max(320),
    featured: z.boolean(),
    breaking: z.boolean(),
    status: z.enum([
      "draft",
      "needs_review",
      "scheduled",
      "published",
      "archived",
      "failed",
    ]),
    scheduledAtLocal: z.string().trim().max(32),
    sourceName: z.string().trim().max(200),
    sourceUrl: z.string().trim().max(2000),
  })
  .superRefine((data, ctx) => {
    if (
      data.coverImageUrl &&
      !(
        data.coverImageUrl.startsWith("/") ||
        /^https?:\/\//i.test(data.coverImageUrl)
      )
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["coverImageUrl"],
        message: "Kapak görseli geçerli bir URL olmalı",
      });
    }
    if (data.sourceUrl && !/^https?:\/\//i.test(data.sourceUrl)) {
      ctx.addIssue({
        code: "custom",
        path: ["sourceUrl"],
        message: "Kaynak URL geçerli olmalı",
      });
    }
    if (data.status === "scheduled") {
      const utc = istanbulDatetimeLocalToUtcIso(data.scheduledAtLocal);
      if (!utc) {
        ctx.addIssue({
          code: "custom",
          path: ["scheduledAtLocal"],
          message: "Planlanan haber için tarih ve saat gerekli",
        });
      } else if (new Date(utc).getTime() <= Date.now()) {
        ctx.addIssue({
          code: "custom",
          path: ["scheduledAtLocal"],
          message: "Planlanan tarih gelecekte olmalı",
        });
      }
    }
  });

type EditFormValues = z.infer<typeof editFormSchema>;

function toDefaults(article: AdminArticleWithRelations): EditFormValues {
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    contentMarkdown: article.content_markdown,
    categoryId: article.category_id ?? "",
    authorId: article.author_id ?? "",
    tags: article.tags.map((tag) => tag.name).join(", "),
    coverImageUrl: article.cover_image_url ?? "",
    seoTitle: article.seo_title ?? "",
    seoDescription: article.seo_description ?? "",
    featured: article.featured,
    breaking: article.breaking,
    status: article.status,
    scheduledAtLocal: utcIsoToIstanbulDatetimeLocal(article.scheduled_at),
    sourceName: article.source_name ?? "",
    sourceUrl: article.source_url ?? "",
  };
}

function EditLivePreview({
  control,
}: {
  control: Control<EditFormValues>;
}) {
  const title = useWatch({ control, name: "title" }) ?? "";
  const excerpt = useWatch({ control, name: "excerpt" }) ?? "";
  const contentMarkdown = useWatch({ control, name: "contentMarkdown" }) ?? "";

  return (
    <EditorialLivePreview
      title={title}
      excerpt={excerpt}
      contentMarkdown={contentMarkdown}
    />
  );
}

export function ArticleEditForm({
  article,
  options,
}: {
  article: AdminArticleWithRelations;
  options: AdminArticleFilterOptions;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [slugTouched, setSlugTouched] = useState(false);
  const defaults = useMemo(() => toDefaults(article), [article]);

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editFormSchema),
    defaultValues: defaults,
  });

  function onSubmit(values: EditFormValues) {
    if (!form.formState.isDirty) {
      toast.message("Değişiklik yok");
      return;
    }

    const payload: UpdateArticleInput = {
      ...values,
      categoryId: values.categoryId || "",
      authorId: values.authorId || "",
    };

    startTransition(async () => {
      const result = await updateArticle(payload);
      if (result.ok) {
        toast.success(result.message ?? "Haber kaydedildi");
        form.reset(values);
        router.refresh();
        return;
      }

      if (result.fieldErrors) {
        for (const [key, messages] of Object.entries(result.fieldErrors)) {
          if (key in values) {
            form.setError(key as keyof EditFormValues, {
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
            Haberi düzenle
          </h1>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {article.title}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/articles/${article.id}`}>Detaya dön</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/articles">Liste</Link>
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Başlık</FormLabel>
                <FormControl>
                  <EditorialTitleInput
                    value={field.value}
                    disabled={pending}
                    name={field.name}
                    onBlur={field.onBlur}
                    onChange={(next) => {
                      field.onChange(next);
                      if (!slugTouched) {
                        form.setValue(
                          "slug",
                          slugifyTurkish(next) || "haber",
                          { shouldDirty: true },
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
                  <Input
                    {...field}
                    disabled={pending}
                    onChange={(event) => {
                      setSlugTouched(true);
                      field.onChange(event);
                    }}
                  />
                </FormControl>
                <FormDescription>Manuel değiştirilebilir.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="excerpt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Spot</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={3}
                    disabled={pending}
                    placeholder="Başlığın altındaki kısa giriş metni…"
                    className="text-base leading-relaxed"
                  />
                </FormControl>
                <FormDescription>
                  Okuyucunun ilk gördüğü özet cümle. Ana başlık değildir.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <FormField
              control={form.control}
              name="contentMarkdown"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>İçerik</FormLabel>
                  <FormControl>
                    <EditorialMarkdownEditor
                      value={field.value}
                      disabled={pending}
                      name={field.name}
                      onBlur={field.onBlur}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <EditLivePreview control={form.control} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kategori</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      disabled={pending}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    >
                      <option value="">Seçilmedi</option>
                      {options.categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
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
              name="authorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Yazar</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      disabled={pending}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    >
                      <option value="">Seçilmedi</option>
                      {options.authors.map((author) => (
                        <option key={author.id} value={author.id}>
                          {author.name}
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
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Durum</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      disabled={pending}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {ARTICLE_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="tags"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Etiketler</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    disabled={pending}
                    placeholder="yapay zeka, llm, ürün"
                  />
                </FormControl>
                <FormDescription>Virgülle ayırın.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <FormField
              control={form.control}
              name="coverImageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <CoverImageField
                      value={field.value}
                      onChange={(url) => {
                        field.onChange(url);
                        form.setValue("coverImageUrl", url, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                      }}
                      disabled={pending}
                      error={form.formState.errors.coverImageUrl?.message}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="scheduledAtLocal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Planlanan tarih (Europe/Istanbul)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="datetime-local"
                      disabled={pending}
                    />
                  </FormControl>
                  <FormDescription>
                    Veritabanında UTC olarak saklanır.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <FormField
              control={form.control}
              name="seoTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SEO başlığı</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={pending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="seoDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SEO açıklaması</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} disabled={pending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <FormField
              control={form.control}
              name="sourceName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kaynak adı</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={pending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sourceUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kaynak URL</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={pending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex flex-wrap gap-6">
            <FormField
              control={form.control}
              name="featured"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={pending}
                    />
                  </FormControl>
                  <FormLabel className="!mt-0">Öne çıkan</FormLabel>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="breaking"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={pending}
                    />
                  </FormControl>
                  <FormLabel className="!mt-0">Son dakika</FormLabel>
                </FormItem>
              )}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Kaydediliyor…" : "Kaydet"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => {
                form.reset(defaults);
                setSlugTouched(false);
              }}
            >
              Sıfırla
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
