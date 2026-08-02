import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const form = await request.formData();
  const identifier = String(form.get("identifier") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  if (!identifier || !password) {
    return NextResponse.redirect(new URL("/login?error=credentials", request.url), 303);
  }

  let email = identifier;
  if (!identifier.includes("@")) {
    const db = getSupabaseAdmin();
    const { data: account } = await db
      .from("customer_accounts")
      .select("email")
      .ilike("login", identifier)
      .eq("status", "active")
      .maybeSingle();
    if (!account?.email) {
      return NextResponse.redirect(new URL("/login?error=credentials", request.url), 303);
    }
    email = account.email;
  }

  const supabase = await getSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return NextResponse.redirect(new URL("/login?error=credentials", request.url), 303);
  }
  return NextResponse.redirect(new URL("/client", request.url), 303);
}
