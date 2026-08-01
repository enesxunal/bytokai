import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Database } from "lucide-react";

import { CategoryForm } from "@/components/admin/category-form";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { getAdminCategoryById } from "@/lib/admin/categories";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { category } = await getAdminCategoryById(id);
  return {
    title: category ? `Düzenle: ${category.name}` : "Kategoriyi düzenle",
    robots: { index: false, follow: false },
  };
}

export default async function AdminCategoryEditPage({ params }: PageProps) {
  const { id } = await params;
  const { connected, category } = await getAdminCategoryById(id);

  if (!connected) {
    return (
      <div className="space-y-6">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">
          Kategoriyi düzenle
        </h1>
        <EmptyState
          icon={Database}
          title="Veritabanı bağlı değil"
          description="Supabase ortam değişkenlerini ayarladıktan sonra düzenleme formu burada görünecek."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/categories">Listeye dön</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (!category) {
    notFound();
  }

  return <CategoryForm mode="edit" category={category} />;
}
