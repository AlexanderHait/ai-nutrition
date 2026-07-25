import { NextResponse } from "next/server";
import { sessionCookie } from "@/lib/auth";

function logout(req: Request) {
  const res = NextResponse.redirect(new URL("/login", req.url), 303);
  const secure = process.env.NODE_ENV === "production";

  // Удаляем именно ту cookie, которую реально использует lib/auth.ts.
  res.cookies.set(sessionCookie, "", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  res.cookies.set("tg_oidc_state", "", { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 0 });
  res.cookies.set("tg_oidc_verifier", "", { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}

export async function GET(req: Request) {
  return logout(req);
}

export async function POST(req: Request) {
  return logout(req);
}
