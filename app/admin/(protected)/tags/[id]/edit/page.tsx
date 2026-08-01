import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Database } from "lucide-react";

import { TagForm } from "@/components/admin/tag-form";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { getAdminTagById } from "@/lib/admin/tags";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { tag } = await getAdminTagById(id);
  return {
    title: tag ? `Düzenle: ${tag.name}` : "Etiketi düzenle",
    robots: { index: false, follow: false },
  };
}

export default async function AdminTagEditPage({ params }: PageProps) {
  const { id } = await params;
  const { connected, tag } = await getAdminTagById(id);

  if (!connected) {
    return (
      <div className="space-y-6">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">
          Etiketi düzenle
        </h1>
        <EmptyState
          icon={Database}
          title="Veritabanı bağlı değil"
          description="Supabase ortam değişkenlerini ayarladıktan sonra düzenleme formu burada görünecek."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/tags">Listeye dön</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (!tag) {
    notFound();
  }

  return <TagForm mode="edit" tag={tag} />;
}
