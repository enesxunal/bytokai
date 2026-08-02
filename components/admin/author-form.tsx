"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import {
  createAuthor,
  updateAuthor,
} from "@/app/admin/(protected)/authors/actions";
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
import type { DbAuthor } from "@/lib/database/types";
import { slugifyTurkish } from "@/lib/utils/slug";

const authorFormSchema = z.object({
  name: z.string().trim().min(1, "İsim gerekli").max(120),
  slug: z
    .string()
    .trim()
    .min(1, "Slug gerekli")
    .max(120)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug yalnızca küçük harf, rakam ve tire içerebilir",
    ),
  role: z.string().trim().min(1, "Rol gerekli").max(120),
  short_bio: z.string().trim().max(500),
  full_bio: z.string().trim().max(10_000),
  expertise: z.string().max(2000),
  tone: z.string().trim().max(500),
  writing_rules: z.string().max(20_000),
  system_prompt: z.string().max(50_000),
  avatar_seed: z.string().trim().max(120),
  active: z.boolean(),
});

type AuthorFormValues = z.infer<typeof authorFormSchema>;

type AuthorFormProps = {
  mode: "create" | "edit";
  author?: DbAuthor;
};

export function AuthorForm({ mode, author }: AuthorFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<AuthorFormValues>({
    resolver: zodResolver(authorFormSchema),
    defaultValues: {
      name: author?.name ?? "",
      slug: author?.slug ?? "",
      role: author?.role ?? "",
      short_bio: author?.short_bio ?? "",
      full_bio: author?.full_bio ?? "",
      expertise: author?.expertise?.join(", ") ?? "",
      tone: author?.tone ?? "",
      writing_rules: author?.writing_rules ?? "",
      system_prompt: author?.system_prompt ?? "",
      avatar_seed: author?.avatar_seed ?? "",
      active: author?.active ?? true,
    },
  });

  function onSubmit(values: AuthorFormValues) {
    startTransition(async () => {
      const result =
        mode === "edit" && author
          ? await updateAuthor({ id: author.id, ...values })
          : await createAuthor(values);

      if (!result.ok) {
        toast.error(result.message ?? "Kayıt başarısız");
        if (result.fieldErrors) {
          for (const [key, messages] of Object.entries(result.fieldErrors)) {
            form.setError(key as keyof AuthorFormValues, {
              message: messages[0],
            });
          }
        }
        return;
      }

      toast.success(result.message ?? "Kaydedildi");
      router.push(`/admin/authors/${result.data.id}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">
          {mode === "create" ? "Yeni yazar profili" : "Profili düzenle"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Public biyografi ile editoryal üretim alanlarını (ton, yazım kuralları,
          system prompt) birlikte yönetirsiniz.
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-5 rounded-lg border border-border bg-card/40 p-4 sm:p-6"
        >
          <div className="space-y-1 border-b border-border pb-3">
            <h2 className="font-sans text-sm font-semibold tracking-tight">
              Public profil
            </h2>
            <p className="text-xs text-muted-foreground">
              Bu alanlar yazar sayfasında ve ana sayfada görünür.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>İsim</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={pending}
                      onBlur={(event) => {
                        field.onBlur();
                        const currentSlug = form.getValues("slug");
                        const currentSeed = form.getValues("avatar_seed");
                        if (!currentSlug && event.target.value.trim()) {
                          const slug =
                            slugifyTurkish(event.target.value) || "yazar";
                          form.setValue("slug", slug, { shouldValidate: true });
                          if (!currentSeed) {
                            form.setValue("avatar_seed", slug);
                          }
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
                    Public yazar sayfası kimliği.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rol</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    disabled={pending}
                    placeholder="Örn. Yazılım, Modeller ve Geliştirici Araçları Yazarı"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="short_bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kısa biyografi</FormLabel>
                <FormControl>
                  <Textarea {...field} disabled={pending} rows={3} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="full_bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Uzun biyografi</FormLabel>
                <FormControl>
                  <Textarea {...field} disabled={pending} rows={6} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="expertise"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Uzmanlık alanları</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    disabled={pending}
                    rows={3}
                    placeholder="API, benchmark, açık kaynak modeller"
                  />
                </FormControl>
                <FormDescription>
                  Virgül veya satır ile ayırın. Veritabanında text dizisi olarak
                  saklanır.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="avatar_seed"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Avatar seed</FormLabel>
                <FormControl>
                  <Input {...field} disabled={pending} className="font-mono" />
                </FormControl>
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
                    Pasif profiller otomatik seçime dahil edilmez.
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

          <div className="space-y-1 border-b border-border pb-3 pt-4">
            <h2 className="font-sans text-sm font-semibold tracking-tight">
              Editoryal üretim (yalnızca admin)
            </h2>
            <p className="text-xs text-muted-foreground">
              Ton, yazım kuralları ve system prompt public sayfalara taşınmaz.
            </p>
          </div>

          <FormField
            control={form.control}
            name="tone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ton</FormLabel>
                <FormControl>
                  <Textarea {...field} disabled={pending} rows={3} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="writing_rules"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Yazım kuralları</FormLabel>
                <FormControl>
                  <Textarea {...field} disabled={pending} rows={8} />
                </FormControl>
                <FormDescription>
                  Madde madde kurallar metin olarak saklanır.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="system_prompt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>System prompt</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    disabled={pending}
                    rows={12}
                    className="font-mono text-xs leading-relaxed"
                  />
                </FormControl>
                <FormDescription>
                  Yalnızca admin panelinde tutulur; public sayfalara
                  yansıtılmaz.
                </FormDescription>
                <FormMessage />
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
                  mode === "edit" && author
                    ? `/admin/authors/${author.id}`
                    : "/admin/authors"
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
