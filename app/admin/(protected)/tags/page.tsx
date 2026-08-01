import type { Metadata } from "next";

import { TagsListView } from "@/components/admin/tags-list";
import { loadAdminTagsList } from "@/lib/admin/tags";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Etiketler",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminTagsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const data = await loadAdminTagsList(params);

  return <TagsListView data={data} />;
}
