import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Database } from "lucide-react";

import { RawArticleDetailView } from "@/components/admin/raw-article-detail-view";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { getAdminRawArticleById } from "@/lib/admin/raw-articles";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { article } = await getAdminRawArticleById(id);
  return {
    title: article?.original_title
      ? article.original_title
      : "Ham haber detayı",
    robots: { index: false, follow: false },
  };
}

export default async function AdminRawArticleDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { connected, article } = await getAdminRawArticleById(id);

  if (!connected) {
    return (
      <div className="space-y-6">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">
          Ham haber detayı
        </h1>
        <EmptyState
          icon={Database}
          title="Veritabanı bağlı değil"
          description="Supabase ortam değişkenlerini ayarladıktan sonra ham haber detayı burada görünecek."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/raw-articles">Listeye dön</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (!article) {
    notFound();
  }

  return <RawArticleDetailView article={article} />;
}
