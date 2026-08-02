import type { Metadata } from "next";
import Link from "next/link";
import { Database } from "lucide-react";

import { ArticleCreateForm } from "@/components/admin/article-create-form";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { loadAdminArticleCreateData } from "@/lib/admin/articles";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Yeni haber",
  robots: { index: false, follow: false },
};

export default async function AdminArticleNewPage() {
  const { connected, options } = await loadAdminArticleCreateData();

  if (!connected) {
    return (
      <div className="space-y-6">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">
          Yeni haber
        </h1>
        <EmptyState
          icon={Database}
          title="Veritabanı bağlı değil"
          description="Supabase ortam değişkenlerini ayarladıktan sonra haber oluşturma formu burada görünecek."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/articles">Listeye dön</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return <ArticleCreateForm options={options} />;
}
