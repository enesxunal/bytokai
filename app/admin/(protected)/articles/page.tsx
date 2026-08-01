import type { Metadata } from "next";

import { ArticlesListView } from "@/components/admin/articles-list";
import { loadAdminArticlesList } from "@/lib/admin/articles";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Haberler",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminArticlesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const data = await loadAdminArticlesList(params);

  return <ArticlesListView data={data} />;
}
