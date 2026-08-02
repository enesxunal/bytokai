import { BookPublishingCta } from "@/components/book-submissions/book-publishing-cta";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getCategories } from "@/lib/database/categories";
import { getSiteSettings } from "@/lib/database/settings";

export default async function PublicSiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [settings, categories] = await Promise.all([
    getSiteSettings(),
    getCategories(),
  ]);

  return (
    <>
      <SiteHeader categories={categories} />
      <div className="flex-1">{children}</div>
      <BookPublishingCta />
      <SiteFooter settings={settings} categories={categories} />
    </>
  );
}
