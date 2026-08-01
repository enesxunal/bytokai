import type { Metadata } from "next";

import { AuthorsListView } from "@/components/admin/authors-list";
import { loadAdminAuthorsList } from "@/lib/admin/authors";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Yazar Personaları",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminAuthorsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const data = await loadAdminAuthorsList(params);

  return <AuthorsListView data={data} />;
}
