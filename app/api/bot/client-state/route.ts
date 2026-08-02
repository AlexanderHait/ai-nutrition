import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { dayKey, mealSessions, sumMeals, type Meal } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.BOT_INGEST_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const chatId = Number(new URL(req.url).searchParams.get("chat_id"));
  if (!Number.isSafeInteger(chatId) || chatId <= 0) {
    return NextResponse.json({ error: "bad chat_id" }, { status: 400 });
  }

  const s = getSupabaseAdmin();
  const d7 = new Date();
  d7.setDate(d7.getDate() - 6);
  const fromDay = dayKey(d7);
  const today = dayKey();

  const [
    { data: profile },
    { data: settings },
    { data: meals },
    { data: weight },
    { data: legacySubscription },
    { data: subscriptionAccess, error: accessError },
  ] = await Promise.all([
    s.from("profiles").select("telegram_id,first_name,username,avatar_url").eq("telegram_id", chatId).maybeSingle(),
    s.from("client_settings").select("*").eq("chat_id", chatId).maybeSingle(),
    s.from("meals").select("id,chat_id,dish,grams,kcal,prot,fat,carb,eaten_at,eaten_day,deleted").eq("chat_id", chatId).eq("deleted", false).gte("eaten_day", fromDay).order("eaten_at", { ascending: false }).limit(500),
    s.from("weight_logs").select("weight_kg,measured_at").eq("chat_id", chatId).order("measured_at", { ascending: false }).limit(1).maybeSingle(),
    s.from("subscriptions").select("plan,status,price_rub,started_at,ends_at,created_at").eq("chat_id", chatId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    s.rpc("subscription_access_v1", { _chat_id: chatId }),
  ]);

  if (!profile) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (accessError || !subscriptionAccess) {
    console.error("bot client subscription access failed", {
      chatId,
      code: accessError?.code,
      message: accessError?.message,
    });
    return NextResponse.json({ error: "subscription access unavailable" }, { status: 503 });
  }

  const rows = (meals || []) as Meal[];
  const byDay = new Map<string, Meal[]>();
  for (const meal of rows) {
    const key = String(meal.eaten_day).slice(0, 10);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(meal);
  }

  const todayMeals = byDay.get(today) || [];
  const todaySessions = mealSessions(todayMeals);
  const recent = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const day = dayKey(date);
    const dayMeals = byDay.get(day) || [];
    return { day, total: sumMeals(dayMeals), sessions: mealSessions(dayMeals) };
  });
  const st: any = settings || {};
  const access: any = subscriptionAccess;
  const subscription = {
    ...(legacySubscription || {}),
    plan: access.plan,
    status: access.state,
    state: access.state,
    premium: Boolean(access.premium),
    provider: access.provider,
    trial_available: Boolean(access.trial_available),
    trial_ends_at: access.trial_ends_at,
    current_period_end: access.current_period_end,
    ends_at: access.trial_ends_at || access.current_period_end || legacySubscription?.ends_at || null,
    limits: access.limits,
    usage: access.usage,
    pending: access.pending,
    remaining: access.remaining,
    can_photo_analysis: Boolean(access.can_photo_analysis),
    can_ai_request: Boolean(access.can_ai_request),
  };

  return NextResponse.json(
    {
      day: today,
      profile,
      settings: {
        goal: st.goal || null,
        kcal_target: Number(st.kcal_target || 0),
        protein_target: Number(st.protein_target || st.protein_target_g || st.prot_target || 0),
        fat_target: Number(st.fat_target || st.fat_target_g || 0),
        carb_target: Number(st.carb_target || st.carb_target_g || 0),
        current_weight_kg: Number(st.current_weight_kg || weight?.weight_kg || 0),
        target_weight_kg: Number(st.target_weight_kg || 0),
        height_cm: Number(st.height_cm || 0),
        activity_level: st.activity_level || null,
      },
      today: {
        total: sumMeals(todayMeals),
        meal_count: todaySessions.length,
        sessions: todaySessions.map((item) => ({
          time: item.time,
          total: item.total,
          items: item.meals.map((meal) => meal.dish),
        })),
      },
      week: {
        days: recent.map((item) => ({
          day: item.day,
          total: item.total,
          meal_count: item.sessions.length,
        })),
        avg_kcal_7: Math.round(recent.reduce((total, item) => total + item.total.kcal, 0) / 7),
        active_days: recent.filter((item) => item.sessions.length > 0).length,
        meal_count: recent.reduce((total, item) => total + item.sessions.length, 0),
      },
      subscription,
      subscription_access: access,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
