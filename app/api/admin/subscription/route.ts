import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Plan = "none" | "basic" | "premium";
const ALLOWED = new Set<Plan>(["none", "basic", "premium"]);

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars are missing");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function assertAdmin(_request: NextRequest) {
  // IMPORTANT: replace this with the EXISTING admin-session check from TeddY.
  // Example:
  // const admin = await requireAdmin();
  // if (!admin) throw new Error("FORBIDDEN");
  return true;
}

export async function POST(request: NextRequest) {
  try {
    await assertAdmin(request);

    const body = await request.json();
    const chatId = Number(body?.chatId);
    const plan = String(body?.plan || "").toLowerCase() as Plan;

    if (!Number.isFinite(chatId) || chatId <= 0) {
      return NextResponse.json({ ok: false, error: "Некорректный chatId" }, { status: 400 });
    }
    if (!ALLOWED.has(plan)) {
      return NextResponse.json({ ok: false, error: "Некорректный тариф" }, { status: 400 });
    }

    const db = supabaseAdmin();

    if (plan === "none") {
      const { error } = await db
        .from("subscription_lifecycle")
        .delete()
        .eq("chat_id", chatId);
      if (error) throw error;
    } else {
      const { error } = await db
        .from("subscription_lifecycle")
        .upsert(
          {
            chat_id: chatId,
            plan,
            state: "active",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "chat_id" },
        );
      if (error) throw error;
    }

    return NextResponse.json({ ok: true, chatId, plan });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка";
    return NextResponse.json(
      { ok: false, error: message },
      { status: message === "FORBIDDEN" ? 403 : 500 },
    );
  }
}
