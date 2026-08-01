import type { Metadata } from "next";

import { RawArticlesListView } from "@/components/admin/raw-articles-list";
import { loadAdminRawArticlesList } from "@/lib/admin/raw-articles";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ham Haberler",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminRawArticlesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const data = await loadAdminRawArticlesList(params);

  return <RawArticlesListView data={data} />;
}
