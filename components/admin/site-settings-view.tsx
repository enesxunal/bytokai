"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Database } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import {
  updateSiteSettings,
  type AdminSiteSettingsPageData,
  type SiteSettingsFormInput,
} from "@/lib/admin/site-settings-admin";
import { formatIstanbul } from "@/lib/utils/date";

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) =>
      value === "" ||
      value.startsWith("/") ||
      /^https?:\/\//i.test(value),
    "Geçerli bir URL veya yol girin",
  );

const siteSettingsFormSchema = z.object({
  site_name: z
    .string()
    .trim()
    .min(1, "Site adı gerekli")
    .max(120, "Site adı en fazla 120 karakter olabilir"),
  site_description: z
    .string()
    .trim()
    .min(1, "Site açıklaması gerekli")
    .max(500, "Site açıklaması en fazla 500 karakter olabilir"),
  site_url: z
    .string()
    .trim()
    .url("Geçerli bir site URL’si girin")
    .max(300),
  default_og_image: z
    .string()
    .trim()
    .min(1, "Varsayılan SEO görseli gerekli")
    .max(500)
    .refine(
      (value) => value.startsWith("/") || /^https?:\/\//i.test(value),
      "Görsel yolu / ile veya https:// ile başlamalı",
    ),
  ai_disclosure_text: z
    .string()
    .trim()
    .min(1, "AI açıklama metni gerekli")
    .max(2000, "AI açıklama metni en fazla 2000 karakter olabilir"),
  social_x: optionalUrl,
  social_linkedin: optionalUrl,
  social_rss: optionalUrl,
});

function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    return formatIstanbul(value, "dd MMM yyyy HH:mm");
  } catch {
    return "—";
  }
}

export function SiteSettingsView({ data }: { data: AdminSiteSettingsPageData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const disabled = !data.connected;

  const form = useForm<SiteSettingsFormInput>({
    resolver: zodResolver(siteSettingsFormSchema),
    defaultValues: data.settings,
  });

  function onSubmit(values: SiteSettingsFormInput) {
    startTransition(async () => {
      const result = await updateSiteSettings(values);
      if (!result.ok) {
        toast.error(result.message ?? "Kayıt başarısız");
        if (result.fieldErrors) {
          for (const [key, messages] of Object.entries(result.fieldErrors)) {
            form.setError(key as keyof SiteSettingsFormInput, {
              message: messages[0],
            });
          }
        }
        return;
      }

      if (result.data.updatedKeys.length === 0) {
        toast.message(result.message ?? "Değişiklik yok");
      } else {
        toast.success(result.message ?? "Ayarlar kaydedildi");
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">
          Ayarlar
        </h1>
        <p className="text-sm text-muted-foreground">
          Genel site bilgileri, sosyal bağlantılar ve AI açıklama metni.
          {data.settingsKnown ? (
            <span className="mt-1 block text-xs">
              Son güncelleme: {formatDate(data.updatedAt)}
            </span>
          ) : null}
        </p>
      </div>

      {!data.connected ? (
        <EmptyState
          icon={Database}
          title="Veritabanı bağlı değil"
          description="Site ayarlarını düzenlemek için Supabase bağlantısı gerekir."
        />
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card className="shadow-none">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="font-sans text-base font-semibold">
                  Genel site
                </CardTitle>
                <CardDescription>
                  Ad, açıklama, URL ve varsayılan SEO görseli
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 p-4 pt-2 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="site_name"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Site adı</FormLabel>
                      <FormControl>
                        <Input disabled={disabled || pending} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="site_description"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Site açıklaması</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          disabled={disabled || pending}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="site_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Site URL</FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          disabled={disabled || pending}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="default_og_image"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Varsayılan SEO görseli</FormLabel>
                      <FormControl>
                        <Input disabled={disabled || pending} {...field} />
                      </FormControl>
                      <FormDescription>
                        `/og-default.png` veya tam URL
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="font-sans text-base font-semibold">
                  Sosyal medya ve kaynak görünürlüğü
                </CardTitle>
                <CardDescription>
                  X, LinkedIn ve RSS (kaynak feed) bağlantıları
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 p-4 pt-2 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="social_x"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>X (Twitter)</FormLabel>
                      <FormControl>
                        <Input disabled={disabled || pending} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="social_linkedin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>LinkedIn</FormLabel>
                      <FormControl>
                        <Input disabled={disabled || pending} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="social_rss"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>RSS / kaynak feed</FormLabel>
                      <FormControl>
                        <Input disabled={disabled || pending} {...field} />
                      </FormControl>
                      <FormDescription>
                        Site altbilgisinde kaynak feed görünürlüğü
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="font-sans text-base font-semibold">
                  AI açıklama metni
                </CardTitle>
                <CardDescription>
                  Haber sayfalarında gösterilen yapay zekâ açıklaması
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <FormField
                  control={form.control}
                  name="ai_disclosure_text"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Açıklama</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={4}
                          disabled={disabled || pending}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={disabled || pending}>
                {pending ? "Kaydediliyor…" : "Ayarları Kaydet"}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}
