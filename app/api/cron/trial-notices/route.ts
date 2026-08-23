import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  DEFAULT_TRIAL_PLAN_FACTS,
  trialNoticeText,
  type TrialNotice,
  type TrialPlanFacts,
} from "@/lib/trial-notice";

export const dynamic = "force-dynamic";

// За сколько дней до конца беты предупреждаем.
const DAYS_BEFORE = 3;

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.smartnutrition-ai.ru")
  .trim()
  .replace(/\/$/, "");

// Цена и лимиты берутся из справочника, а не зашиты в текст: поменяет владелец
// тариф — сообщение изменится вместе с ним. Справочник не прочитался — уходят
// сегодняшние значения: недосказанная цена лучше неотправленного письма.
async function planFacts(db: ReturnType<typeof getSupabaseAdmin>): Promise<TrialPlanFacts> {
  const facts = { ...DEFAULT_TRIAL_PLAN_FACTS };
  try {
    const { data } = await db
      .from("subscription_products")
      .select("price_rub, photo_limit, ai_request_limit")
      .eq("plan", "basic")
      .limit(1);
    const basic = data?.[0];
    if (basic) {
      if (Number(basic.price_rub) > 0) facts.priceRub = Number(basic.price_rub);
      if (Number(basic.photo_limit) > 0) facts.photoLimit = Number(basic.photo_limit);
      if (Number(basic.ai_request_limit) > 0) facts.aiLimit = Number(basic.ai_request_limit);
    }
    const { data: free } = await db.rpc("subscription_plan_limits_v1", { _plan: "free" });
    const limits = Array.isArray(free) ? free[0] : free;
    if (limits) {
      const photo = Number(limits.photo_analysis ?? limits.photo_limit);
      const ai = Number(limits.ai_request ?? limits.ai_request_limit);
      if (photo > 0) facts.freePhotoLimit = photo;
      if (ai > 0) facts.freeAiLimit = ai;
    }
  } catch (error) {
    console.error("trial notice plan facts failed", { error: String(error).slice(0, 200) });
  }
  return facts;
}

async function send(notice: TrialNotice, botToken: string, facts: TrialPlanFacts) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: String(notice.chat_id),
      text: trialNoticeText(notice, facts),
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [[{ text: "Оформить Basic", url: `${siteUrl}/client/plan` }]],
      },
    }),
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (response.ok) return true;
  const body = await response.text().catch(() => "");
  console.error("trial notice delivery failed", {
    kind: notice.kind,
    status: response.status,
    body: body.slice(0, 200),
  });
  return false;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Сухой прогон: показать, кому бы ушло сообщение, ничего не отправляя
  // и не помечая отправленным.
  const dry = new URL(request.url).searchParams.get("dry") === "1";
  const db = getSupabaseAdmin();

  const { data, error } = await db.rpc("claim_subscription_trial_notices_v1", {
    _days_before: DAYS_BEFORE,
    _limit: 200,
    _claim: !dry,
  });

  if (error) {
    console.error("trial notice lookup failed", { code: error.code, message: error.message });
    return NextResponse.json({ ok: false, error: "lookup_failed" }, { status: 500 });
  }

  const notices = (data || []) as TrialNotice[];
  const facts = await planFacts(db);
  if (dry) {
    return NextResponse.json({
      ok: true,
      dry_run: true,
      plan: facts,
      due: notices.map((notice) => ({
        kind: notice.kind,
        days_left: notice.days_left,
        ends_at: notice.ends_at,
        preview: trialNoticeText(notice, facts),
      })),
    });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error("trial notice delivery failed: bot token missing");
    return NextResponse.json({ ok: false, error: "bot_unavailable" }, { status: 500 });
  }

  let sent = 0;
  for (const notice of notices) {
    if (await send(notice, botToken, facts)) {
      sent += 1;
      // Событие пишется только после доставки — иначе в статистике окажутся
      // сообщения, которых человек не получал.
      await db.from("bot_events").insert({
        chat_id: notice.chat_id,
        account_id: notice.account_id,
        event_type: notice.kind === "trial_ended" ? "trial_ended_notice" : "trial_ending_notice",
        title: notice.kind === "trial_ended"
          ? "Пробный период закончился"
          : "Пробный период заканчивается",
        payload: { ends_at: notice.ends_at, days_left: notice.days_left },
      }).then(() => undefined, () => undefined);
    } else {
      // Не доставили — снимаем отметку, чтобы попробовать завтра.
      await db.from("subscription_notices")
        .delete()
        .eq("account_id", notice.account_id)
        .eq("kind", notice.kind);
    }
  }

  return NextResponse.json({ ok: true, claimed: notices.length, sent });
}
