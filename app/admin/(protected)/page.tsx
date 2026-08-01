import type { Metadata } from "next";

import { DashboardOverviewView } from "@/components/admin/dashboard-overview";
import { loadDashboardOverview } from "@/lib/admin/dashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Genel Bakış",
  robots: { index: false, follow: false },
};

export default async function AdminHomePage() {
  const data = await loadDashboardOverview();

  return <DashboardOverviewView data={data} />;
}
