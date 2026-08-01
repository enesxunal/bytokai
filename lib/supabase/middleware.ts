import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getClientEnvSoft } from "@/lib/env";

const PUBLIC_ADMIN_PATHS = new Set([
  "/admin/login",
  "/admin/forgot-password",
  "/admin/forbidden",
]);

function isSafeAdminNext(path: string): boolean {
  if (!path.startsWith("/admin")) return false;
  if (path.startsWith("//") || path.includes("\\") || path.includes("://")) {
    return false;
  }
  if (
    path === "/admin/login" ||
    path === "/admin/forgot-password" ||
    path.startsWith("/admin/login?") ||
    path.startsWith("/admin/forgot-password?")
  ) {
    return false;
  }
  return true;
}

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-bytok-admin", "1");

  let redirectUrl: URL | undefined;
  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const env = getClientEnvSoft();

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }

          supabaseResponse = redirectUrl
            ? NextResponse.redirect(redirectUrl)
            : NextResponse.next({
                request: {
                  headers: requestHeaders,
                },
              });

          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const pathname = request.nextUrl.pathname;
  const code = request.nextUrl.searchParams.get("code");

  // Password-recovery PKCE exchange before getUser().
  if (code && pathname === "/admin/login") {
    const resetUrl = request.nextUrl.clone();
    resetUrl.pathname = "/admin/login";
    resetUrl.search = "reset=1";
    redirectUrl = resetUrl;

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (!supabaseResponse.headers.get("location") && redirectUrl) {
        supabaseResponse = NextResponse.redirect(redirectUrl);
      }
      return supabaseResponse;
    }
    redirectUrl = undefined;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdminRoute = pathname.startsWith("/admin");
  const isPublicAdminPath = PUBLIC_ADMIN_PATHS.has(pathname);
  const isLoginRoute = pathname === "/admin/login";
  const isPasswordReset =
    isLoginRoute && request.nextUrl.searchParams.get("reset") === "1";

  if (isAdminRoute && !isPublicAdminPath && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.search = "";
    if (isSafeAdminNext(pathname)) {
      loginUrl.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (isLoginRoute && user && !isPasswordReset) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/admin";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  return supabaseResponse;
}
