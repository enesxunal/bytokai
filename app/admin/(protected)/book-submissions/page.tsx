import type { Metadata } from "next";

import { BookSubmissionsListView } from "@/components/admin/book-submissions-list";
import { loadAdminBookSubmissionsList } from "@/lib/admin/book-submissions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kitap Başvuruları",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminBookSubmissionsPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const data = await loadAdminBookSubmissionsList(params);
  return <BookSubmissionsListView data={data} />;
}
