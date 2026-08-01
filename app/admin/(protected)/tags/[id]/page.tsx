import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TagDetailView } from "@/components/admin/tag-detail-view";
import { loadAdminTagDetail } from "@/lib/admin/tags";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { tag } = await loadAdminTagDetail(id);
  return {
    title: tag ? tag.name : "Etiket",
    robots: { index: false, follow: false },
  };
}

export default async function AdminTagDetailPage({ params }: PageProps) {
  const { id } = await params;
  const data = await loadAdminTagDetail(id);

  if (data.connected && !data.tag) {
    notFound();
  }

  return <TagDetailView data={data} />;
}
