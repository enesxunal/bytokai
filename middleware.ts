import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match admin routes and refresh session cookies.
     * Skip static assets and image optimization.
     */
    "/admin/:path*",
  ],
};
