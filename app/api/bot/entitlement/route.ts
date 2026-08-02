import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type Body = {
  action?: "reserve" | "commit" | "release";
  chat_id?: number | string;
  feature?: string;
  source_event_id?: string;
  metadata?: Record<string, unknown>;
};

function authorized(request: Request) {
  const secret = process.env.BOT_INGEST_SECRET?.trim();
  const actual = request.headers.get("authorization") || "";
  const expected = secret ? `Bearer ${secret}` : "";
  if (!expected || actual.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

function safeChatId(value: unknown) {
  const chatId = Number(value);
  return Number.isSafeInteger(chatId) && chatId > 0 ? chatId : null;
}

function limitMessage(feature: string, access: any) {
  const limit = feature === "photo_analysis"
    ? access?.limits?.photo_analysis
    : access?.limits?.ai_request;
  const label = feature === "photo_analysis" ? "распознаваний еды по фото" : "AI-запросов";
  return `Месячный лимит Basic исчерпан${limit ? `: ${limit} ${label}` : ""}. В Premium эти функции доступны без лимита.`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const chatId = safeChatId(new URL(request.url).searchParams.get("chat_id"));
  if (!chatId) return NextResponse.json({ ok: false, error: "Invalid chat_id" }, { status: 400 });

  const { data, error } = await getSupabaseAdmin().rpc("subscription_access_v1", {
    _chat_id: chatId,
  });
  if (error || !data) {
    console.error("bot entitlement lookup failed", {
      chatId,
      code: error?.code,
      message: error?.message,
    });
    return NextResponse.json({ ok: false, error: "Access unavailable" }, { status: 503 });
  }

  return NextResponse.json({ ok: true, access: data }, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action || "reserve";
  const chatId = safeChatId(body.chat_id);
  const feature = String(body.feature || "").trim();
  const sourceEventId = String(body.source_event_id || "").trim();
  if (!feature || !sourceEventId || (action === "reserve" && !chatId)) {
    return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const result = action === "reserve"
    ? await db.rpc("subscription_quota_reserve_v1", {
        _chat_id: chatId,
        _feature: feature,
        _source_event_id: sourceEventId,
        _metadata: body.metadata || {},
      })
    : await db.rpc("subscription_quota_finalize_v1", {
        _source_event_id: sourceEventId,
        _feature: feature,
        _result: action,
      });

  if (result.error || !result.data) {
    console.error("bot entitlement mutation failed", {
      action,
      chatId,
      feature,
      sourceEventId,
      code: result.error?.code,
      message: result.error?.message,
    });
    const status = result.error?.code === "P0002" ? 404 : result.error?.code === "22023" ? 400 : 500;
    return NextResponse.json({ ok: false, error: "Entitlement operation failed" }, { status });
  }

  const data: any = result.data;
  if (action === "reserve" && data.allowed === false) {
    return NextResponse.json(
      {
        ...data,
        message: limitMessage(String(data.feature || feature), data.access),
        upgrade_url: "/client/plan",
      },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
