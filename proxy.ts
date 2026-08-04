import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/proxy";

const CANONICAL_HOST = "www.smartnutrition-ai.ru";

export async function proxy(request: NextRequest) {
  // Keep every login flow on one hostname. Splitting users between the apex
  // and www domains creates separate browser cookies and looks like a failed
  // login after a redirect or email callback.
  if (request.nextUrl.hostname === "smartnutrition-ai.ru") {
    const url = request.nextUrl.clone();
    url.hostname = CANONICAL_HOST;
    url.protocol = "https:";
    return NextResponse.redirect(url, 308);
  }

  return updateSupabaseSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
