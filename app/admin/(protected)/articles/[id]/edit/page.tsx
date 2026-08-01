import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Database } from "lucide-react";

import { ArticleEditForm } from "@/components/admin/article-edit-form";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { loadAdminArticleEditorData } from "@/lib/admin/articles";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { article } = await loadAdminArticleEditorData(id);
  return {
    title: article ? `Düzenle: ${article.title}` : "Haberi düzenle",
    robots: { index: false, follow: false },
  };
}

export default async function AdminArticleEditPage({ params }: PageProps) {
  const { id } = await params;
  const { connected, article, options } = await loadAdminArticleEditorData(id);

  if (!connected) {
    return (
      <div className="space-y-6">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">
          Haberi düzenle
        </h1>
        <EmptyState
          icon={Database}
          title="Veritabanı bağlı değil"
          description="Supabase ortam değişkenlerini ayarladıktan sonra düzenleme formu burada görünecek."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/articles">Listeye dön</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (!article) {
    notFound();
  }

  return <ArticleEditForm article={article} options={options} />;
}
