import type { Metadata } from "next";

import { SiteSettingsView } from "@/components/admin/site-settings-view";
import { loadAdminSiteSettingsPage } from "@/lib/admin/site-settings-admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ayarlar",
  robots: { index: false, follow: false },
};

export default async function AdminSettingsPage() {
  const data = await loadAdminSiteSettingsPage();
  return (
    <SiteSettingsView
      key={data.updatedAt ?? "defaults"}
      data={data}
    />
  );
}
