import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const form = await request.formData();
  const password = String(form.get("password") || "");
  if (password.length < 10) {
    return NextResponse.redirect(new URL("/reset-password?error=password", request.url), 303);
  }
  const supabase = await getSupabaseServer();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return NextResponse.redirect(new URL("/reset-password?error=session", request.url), 303);
  }
  return NextResponse.redirect(new URL("/client/profile?password=updated", request.url), 303);
}
