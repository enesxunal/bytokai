import type { Metadata } from "next";

import { AiJobsView } from "@/components/admin/ai-jobs-view";
import { loadAdminAiJobsList } from "@/lib/admin/ai-jobs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI İşlemleri",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminAiJobsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const data = await loadAdminAiJobsList(params);
  return <AiJobsView data={data} />;
}
