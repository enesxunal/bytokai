import type { Metadata } from "next";
import Link from "next/link";
import { Database } from "lucide-react";

import { RawArticleCreateForm } from "@/components/admin/raw-article-create-form";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { loadAdminRawArticleCreateData } from "@/lib/admin/raw-articles";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Yeni ham haber",
  robots: { index: false, follow: false },
};

export default async function AdminRawArticleNewPage() {
  const { connected, options } = await loadAdminRawArticleCreateData();

  if (!connected) {
    return (
      <div className="space-y-6">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">
          Yeni ham haber
        </h1>
        <EmptyState
          icon={Database}
          title="Veritabanı bağlı değil"
          description="Supabase ortam değişkenlerini ayarladıktan sonra ham haber ekleme formu burada görünecek."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/raw-articles">Listeye dön</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return <RawArticleCreateForm options={options} />;
}
