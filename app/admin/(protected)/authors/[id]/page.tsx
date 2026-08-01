import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AuthorDetailView } from "@/components/admin/author-detail-view";
import { loadAdminAuthorDetail } from "@/lib/admin/authors";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { author } = await loadAdminAuthorDetail(id);
  return {
    title: author ? author.name : "Yazar personası",
    robots: { index: false, follow: false },
  };
}

export default async function AdminAuthorDetailPage({ params }: PageProps) {
  const { id } = await params;
  const data = await loadAdminAuthorDetail(id);

  if (data.connected && !data.author) {
    notFound();
  }

  return <AuthorDetailView data={data} />;
}
