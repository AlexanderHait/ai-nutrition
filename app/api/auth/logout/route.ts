import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const cookieStore = await cookies();

  // Удаляем наиболее вероятные cookies сессии.
  for (const name of ["ai_nutrition_session", "session", "auth", "client_session", "admin_session"]) {
    cookieStore.delete(name);
  }

  return NextResponse.redirect(new URL("/login", req.url), 303);
}
