import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/config";

export async function updateSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Telegram/code sessions are verified by requireClient(). Refreshing an
  // unrelated Supabase Auth session here only delays every page request.
  if (request.cookies.get("ain_session")?.value) {
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  // Public pages and Telegram-code login do not use Supabase Auth cookies.
  // Avoid a remote Auth request on every navigation when there is no
  // Supabase session to refresh.
  const hasSupabaseAuthCookie = request.cookies.getAll().some(({ name }) =>
    name.startsWith("sb-") && (
      name.includes("auth-token") ||
      name.endsWith("-access-token") ||
      name.endsWith("-refresh-token")
    ),
  );
  if (!hasSupabaseAuthCookie) {
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  await supabase.auth.getUser();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
