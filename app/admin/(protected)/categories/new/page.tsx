import type { Metadata } from "next";
import Link from "next/link";
import { Database } from "lucide-react";

import { CategoryForm } from "@/components/admin/category-form";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { hasSupabaseEnv } from "@/lib/database/safe-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Yeni kategori",
  robots: { index: false, follow: false },
};

export default function AdminCategoryNewPage() {
  if (!hasSupabaseEnv()) {
    return (
      <div className="space-y-6">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">
          Yeni kategori
        </h1>
        <EmptyState
          icon={Database}
          title="Veritabanı bağlı değil"
          description="Supabase ortam değişkenlerini ayarladıktan sonra kategori oluşturma formu burada görünecek."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/categories">Listeye dön</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return <CategoryForm mode="create" />;
}
