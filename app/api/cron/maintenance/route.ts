import { handleCronRoute } from "@/lib/cron/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleCronRoute(request, "maintenance");
}
