import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BookSubmissionDetailView } from "@/components/admin/book-submission-detail-view";
import { getAdminBookSubmissionById } from "@/lib/admin/book-submissions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Başvuru detayı",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminBookSubmissionDetailPage({
  params,
}: PageProps) {
  const { id } = await params;
  const submission = await getAdminBookSubmissionById(id);
  if (!submission) notFound();
  return <BookSubmissionDetailView submission={submission} />;
}
