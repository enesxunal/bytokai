import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Database } from "lucide-react";

import { AuthorForm } from "@/components/admin/author-form";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { getAdminAuthorById } from "@/lib/admin/authors";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { author } = await getAdminAuthorById(id);
  return {
    title: author ? `Düzenle: ${author.name}` : "Personayı düzenle",
    robots: { index: false, follow: false },
  };
}

export default async function AdminAuthorEditPage({ params }: PageProps) {
  const { id } = await params;
  const { connected, author } = await getAdminAuthorById(id);

  if (!connected) {
    return (
      <div className="space-y-6">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">
          Personayı düzenle
        </h1>
        <EmptyState
          icon={Database}
          title="Veritabanı bağlı değil"
          description="Supabase ortam değişkenlerini ayarladıktan sonra düzenleme formu burada görünecek."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/authors">Listeye dön</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (!author) {
    notFound();
  }

  return <AuthorForm mode="edit" author={author} />;
}
