import { NextRequest, NextResponse } from "next/server";
import { session } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type Plan = "none" | "basic" | "premium";
const ALLOWED = new Set<Plan>(["none", "basic", "premium"]);

export async function POST(request: NextRequest) {
  try {
    const auth = await session();
    if (auth?.role !== "admin") return NextResponse.json({ok:false,error:"Нет доступа"},{status:403});
    const body = await request.json();
    const chatId = Number(body?.chatId);
    const plan = String(body?.plan || "").toLowerCase() as Plan;
    if (!Number.isFinite(chatId) || chatId <= 0) return NextResponse.json({ok:false,error:"Некорректный chatId"},{status:400});
    if (!ALLOWED.has(plan)) return NextResponse.json({ok:false,error:"Некорректный тариф"},{status:400});

    const db = getSupabaseAdmin();
    const now = new Date().toISOString();
    const activePlan = plan === "none" ? "basic" : plan;
    const activeStatus = plan === "none" ? "inactive" : "active";
    const activeEndsAt = plan === "none" ? now : null;

    const lifecyclePayload = plan === "none"
      ? {
          chat_id: chatId,
          plan: "basic",
          state: "inactive",
          cancel_at_period_end: false,
          current_period_start: null,
          current_period_end: now,
          updated_at: now,
        }
      : {
          chat_id: chatId,
          plan,
          state: "active",
          cancel_at_period_end: false,
          current_period_start: now,
          current_period_end: null,
          updated_at: now,
        };

    // Supabase generated types are stale after schema update. Runtime schema is correct.
    const {error:e1}=await (db.from("subscription_lifecycle") as any).upsert(lifecyclePayload,{onConflict:"chat_id"});
    if(e1) throw e1;

    const {error:e2}=await db.from("subscriptions").insert({
      chat_id: chatId,
      plan: activePlan,
      status: activeStatus,
      started_at: now,
      ends_at: activeEndsAt,
    });
    if(e2) throw e2;

    return NextResponse.json({ok:true,chatId,plan});
  } catch (e) {
    console.error("admin subscription update failed",e);
    return NextResponse.json({ok:false,error:"Не удалось изменить подписку"},{status:500});
  }
}
