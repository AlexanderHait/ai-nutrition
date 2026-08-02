import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.redirect(new URL("/login?error=email_unconfirmed", request.url), 303);
  }

  const origin = (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
  const supabase = await getSupabaseServer();
  await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=/client/profile` },
  });

  return NextResponse.redirect(new URL("/login?confirmation=sent", request.url), 303);
}
