import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Database } from "lucide-react";

import { SourceForm } from "@/components/admin/source-form";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { getAdminSourceById } from "@/lib/admin/sources";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { source } = await getAdminSourceById(id);
  return {
    title: source ? `Düzenle: ${source.name}` : "Kaynağı düzenle",
    robots: { index: false, follow: false },
  };
}

export default async function AdminSourceEditPage({ params }: PageProps) {
  const { id } = await params;
  const { connected, source } = await getAdminSourceById(id);

  if (!connected) {
    return (
      <div className="space-y-6">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">
          Kaynağı düzenle
        </h1>
        <EmptyState
          icon={Database}
          title="Veritabanı bağlı değil"
          description="Supabase ortam değişkenlerini ayarladıktan sonra düzenleme formu burada görünecek."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/sources">Listeye dön</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (!source) {
    notFound();
  }

  return <SourceForm mode="edit" source={source} />;
}
