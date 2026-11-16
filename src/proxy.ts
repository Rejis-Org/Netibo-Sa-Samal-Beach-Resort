import { createServerClient } from "@supabase/ssr";
import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/database.types";

const handleLocale = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  const env = getSupabaseEnv();
  const hasAuthCookie = request.cookies.getAll().some(({ name }) => name.startsWith("sb-") && name.includes("auth-token"));
  const isAdminPath = request.nextUrl.pathname.startsWith("/admin");

  if (isAdminPath && (!env || !hasAuthCookie)) return NextResponse.next({ request });
  if (!env || (!isAdminPath && !hasAuthCookie)) return handleLocale(request);

  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient<Database>(env.url, env.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([key, value]) => supabaseResponse.headers.set(key, value));
      },
    },
  });

  await supabase.auth.getClaims();
  if (isAdminPath) return supabaseResponse;

  const localeResponse = handleLocale(request);
  supabaseResponse.cookies.getAll().forEach((cookie) => localeResponse.cookies.set(cookie));
  for (const name of ["cache-control", "expires", "pragma"]) {
    const value = supabaseResponse.headers.get(name);
    if (value) localeResponse.headers.set(name, value);
  }
  return localeResponse;
}

export const config = {
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
