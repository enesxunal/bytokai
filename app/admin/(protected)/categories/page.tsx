import type { Metadata } from "next";

import { CategoriesListView } from "@/components/admin/categories-list";
import { loadAdminCategoriesList } from "@/lib/admin/categories";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kategoriler",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminCategoriesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const data = await loadAdminCategoriesList(params);

  return <CategoriesListView data={data} />;
}
