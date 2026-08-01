import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CategoryDetailView } from "@/components/admin/category-detail-view";
import { loadAdminCategoryDetail } from "@/lib/admin/categories";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { category } = await loadAdminCategoryDetail(id);
  return {
    title: category ? category.name : "Kategori",
    robots: { index: false, follow: false },
  };
}

export default async function AdminCategoryDetailPage({ params }: PageProps) {
  const { id } = await params;
  const data = await loadAdminCategoryDetail(id);

  if (data.connected && !data.category) {
    notFound();
  }

  return <CategoryDetailView data={data} />;
}
