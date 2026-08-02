import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getSupabaseServer } from "@/lib/supabase/server";

const LOGIN_RE = /^[a-z0-9][a-z0-9._-]{2,31}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const form = await request.formData();
  const name = String(form.get("name") || "").trim().slice(0, 80);
  const login = String(form.get("login") || "").trim().toLowerCase();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");

  if (!EMAIL_RE.test(email) || !LOGIN_RE.test(login) || password.length < 10) {
    return NextResponse.redirect(new URL("/login?mode=register&error=register_fields", request.url), 303);
  }

  const db = getSupabaseAdmin();
  const { data: duplicate } = await db
    .from("customer_accounts")
    .select("id")
    .ilike("login", login)
    .maybeSingle();
  if (duplicate) {
    return NextResponse.redirect(new URL("/login?mode=register&error=login_taken", request.url), 303);
  }

  const supabase = await getSupabaseServer();
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: name || login, login },
      emailRedirectTo: `${origin}/auth/callback?next=/client/profile`,
    },
  });

  if (error) {
    const code = error.message.toLowerCase().includes("already") ? "email_taken" : "register";
    return NextResponse.redirect(new URL(`/login?mode=register&error=${code}`, request.url), 303);
  }

  const identities = data.user?.identities;
  if (!data.user || (Array.isArray(identities) && identities.length === 0)) {
    return NextResponse.redirect(new URL("/login?mode=register&error=email_taken", request.url), 303);
  }

  return NextResponse.redirect(
    new URL(data.session ? "/client/profile" : `/login?registered=1&email=${encodeURIComponent(email)}`, request.url),
    303,
  );
}
