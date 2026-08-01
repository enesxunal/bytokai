import type { Metadata } from "next";

import { SourcesListView } from "@/components/admin/sources-list";
import { loadAdminSourcesList } from "@/lib/admin/sources";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kaynaklar",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminSourcesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const data = await loadAdminSourcesList(params);

  return <SourcesListView data={data} />;
}
