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

    if (plan === "none") {
      const {error:e1}=await db.from("subscription_lifecycle").delete().eq("chat_id",chatId);
      if(e1) throw e1;
      const {error:e2}=await db.from("subscriptions").insert({chat_id:chatId,plan:"basic",status:"inactive",started_at:now,ends_at:now});
      if(e2) throw e2;
    } else {
      const {error:e1}=await db.from("subscription_lifecycle").upsert({chat_id:chatId,plan,state:"active",cancel_at_period_end:false,current_period_start:now,current_period_end:null,updated_at:now},{onConflict:"chat_id"});
      if(e1) throw e1;
      const {error:e2}=await db.from("subscriptions").insert({chat_id:chatId,plan,status:"active",started_at:now,ends_at:null});
      if(e2) throw e2;
    }
    return NextResponse.json({ok:true,chatId,plan});
  } catch (e) {
    console.error("admin subscription update failed",e);
    return NextResponse.json({ok:false,error:"Не удалось изменить подписку"},{status:500});
  }
}
