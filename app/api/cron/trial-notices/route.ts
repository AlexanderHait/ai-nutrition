import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { trialNoticeText, type TrialNotice } from "@/lib/trial-notice";

export const dynamic = "force-dynamic";

// За сколько дней до конца беты предупреждаем.
const DAYS_BEFORE = 3;

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.smartnutrition-ai.ru")
  .trim()
  .replace(/\/$/, "");

async function send(notice: TrialNotice, botToken: string) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: String(notice.chat_id),
      text: trialNoticeText(notice),
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
  if (dry) {
    return NextResponse.json({
      ok: true,
      dry_run: true,
      due: notices.map((notice) => ({
        kind: notice.kind,
        days_left: notice.days_left,
        ends_at: notice.ends_at,
        preview: trialNoticeText(notice),
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
    if (await send(notice, botToken)) {
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
