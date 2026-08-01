import type { Metadata } from "next";

import { CalendarView } from "@/components/admin/calendar-view";
import { loadAdminCalendar } from "@/lib/admin/calendar";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Yayın Takvimi",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminCalendarPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const data = await loadAdminCalendar(params);

  return <CalendarView data={data} />;
}
