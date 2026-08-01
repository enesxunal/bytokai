import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SourceDetailView } from "@/components/admin/source-detail-view";
import { loadAdminSourceDetail } from "@/lib/admin/sources";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { source } = await loadAdminSourceDetail(id);
  return {
    title: source ? source.name : "Kaynak detayı",
    robots: { index: false, follow: false },
  };
}

export default async function AdminSourceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const data = await loadAdminSourceDetail(id);

  if (data.connected && !data.source) {
    notFound();
  }

  return <SourceDetailView data={data} />;
}
