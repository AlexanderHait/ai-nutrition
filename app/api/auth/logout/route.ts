import { NextResponse } from "next/server";
import { sessionCookie } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase/server";

async function logout(request: Request) {
  try {
    const supabase = await getSupabaseServer();
    await supabase.auth.signOut();
  } catch {
    // The local session is still cleared below.
  }

  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  response.cookies.set(sessionCookie, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
    maxAge: 0,
  });
  return response;
}

export async function GET(request: Request) {
  return logout(request);
}

export async function POST(request: Request) {
  return logout(request);
}
