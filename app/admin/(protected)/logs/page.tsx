import type { Metadata } from "next";

import { SystemLogsView } from "@/components/admin/system-logs-view";
import { loadAdminSystemLogsList } from "@/lib/admin/system-logs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sistem Logları",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminSystemLogsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const data = await loadAdminSystemLogsList(params);
  return <SystemLogsView data={data} />;
}
