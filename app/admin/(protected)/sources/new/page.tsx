import type { Metadata } from "next";
import Link from "next/link";
import { Database } from "lucide-react";

import { SourceForm } from "@/components/admin/source-form";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { hasSupabaseEnv } from "@/lib/database/safe-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Yeni kaynak",
  robots: { index: false, follow: false },
};

export default function AdminSourceNewPage() {
  if (!hasSupabaseEnv()) {
    return (
      <div className="space-y-6">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">
          Yeni kaynak
        </h1>
        <EmptyState
          icon={Database}
          title="Veritabanı bağlı değil"
          description="Supabase ortam değişkenlerini ayarladıktan sonra kaynak oluşturma formu burada görünecek."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/sources">Listeye dön</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return <SourceForm mode="create" />;
}
