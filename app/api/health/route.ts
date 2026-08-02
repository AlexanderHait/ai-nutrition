import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { yooKassaConfigured } from "@/lib/yookassa";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getSupabaseAdmin();
  const { data: products, error } = await db
    .from("subscription_products")
    .select("plan")
    .eq("enabled", true);

  const plans = new Set((products || []).map((row) => row.plan));
  const checks = {
    database: !error,
    password_auth: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    telegram_auth: Boolean(
      process.env.TELEGRAM_CLIENT_ID && process.env.TELEGRAM_CLIENT_SECRET,
    ),
    payment: yooKassaConfigured(),
    plans: plans.has("basic") && plans.has("premium"),
  };
  const ok = Object.values(checks).every(Boolean);

  return NextResponse.json(
    { ok, checks },
    {
      status: ok ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
