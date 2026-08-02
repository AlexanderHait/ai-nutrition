import { NextResponse } from "next/server";
import { session } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { mapTimelineRow, type TimelineRow } from "@/lib/timeline";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await session();
    if (!auth) return NextResponse.json({ ok: false, error: "Нет доступа" }, { status: 401 });

    const url = new URL(request.url);
    const requestedChatId = Number(url.searchParams.get("chat_id"));
    const requestedLimit = Number(url.searchParams.get("limit") || 50);
    const limit = Math.max(10, Math.min(100, Number.isFinite(requestedLimit) ? requestedLimit : 50));

    const isAdmin = auth.role === "admin";
    const chatId = isAdmin ? requestedChatId : Number(auth.chatId);
    if (!Number.isSafeInteger(chatId) || chatId <= 0) {
      return NextResponse.json({ ok: false, error: "Некорректный клиент" }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    const [{ data: rows, error: timelineError }, { data: lifecycle, error: lifecycleError }] = await Promise.all([
      db
        .from("ai_timeline")
        .select("id,event_type,event_at,title,description,payload")
        .eq("chat_id", chatId)
        .order("event_at", { ascending: false })
        .limit(limit),
      db
        .from("subscription_lifecycle")
        .select("plan,state,current_period_end,trial_ends_at,grace_ends_at")
        .eq("chat_id", chatId)
        .maybeSingle(),
    ]);

    if (timelineError) {
      console.error("timeline database read failed", {
        chatId,
        code: timelineError.code,
        message: timelineError.message,
      });
      return NextResponse.json({ ok: false, error: "Не удалось загрузить историю" }, { status: 502 });
    }
    if (lifecycleError) {
      console.error("timeline lifecycle read failed", {
        chatId,
        code: lifecycleError.code,
        message: lifecycleError.message,
      });
    }

    const events = ((rows || []) as TimelineRow[]).map(mapTimelineRow);
    const pendingStrategy = events.filter(
      (event) => event.category === "strategy" && ["pending", "proposed"].includes(String(event.status || "").toLowerCase()),
    ).length;

    return NextResponse.json(
      {
        ok: true,
        events,
        summary: {
          total: events.length,
          pending_strategy: pendingStrategy,
          current_subscription: lifecycle
            ? {
                plan: lifecycle.plan,
                state: lifecycle.state,
                current_period_end:
                  lifecycle.state === "trial"
                    ? lifecycle.trial_ends_at
                    : lifecycle.state === "grace"
                      ? lifecycle.grace_ends_at
                      : lifecycle.current_period_end,
              }
            : null,
        },
      },
      { headers: { "Cache-Control": "private, max-age=15" } },
    );
  } catch (error) {
    console.error("timeline route failed", error);
    return NextResponse.json({ ok: false, error: "Не удалось загрузить историю" }, { status: 502 });
  }
}
