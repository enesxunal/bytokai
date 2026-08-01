import type { Metadata } from "next";

import { AutomationView } from "@/components/admin/automation-view";
import { loadAutomationPage } from "@/lib/admin/automation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Otomasyon",
  robots: { index: false, follow: false },
};

export default async function AdminAutomationPage() {
  const data = await loadAutomationPage();

  return <AutomationView data={data} />;
}
