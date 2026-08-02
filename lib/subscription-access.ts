import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type SubscriptionAccess = {
  chat_id: number;
  plan: "basic" | "premium";
  state: "trial" | "active" | "grace";
  premium: boolean;
  trial_available: boolean;
  trial_used_at: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  provider: string | null;
  period_start: string;
  limits: {
    photo_analysis: number | null;
    ai_request: number | null;
  };
  usage: {
    photo_analysis: number;
    ai_request: number;
  };
  remaining: {
    photo_analysis: number | null;
    ai_request: number | null;
  };
  can_photo_analysis: boolean;
  can_ai_request: boolean;
};

const BASIC_FALLBACK: Omit<SubscriptionAccess, "chat_id" | "period_start"> = {
  plan: "basic",
  state: "active",
  premium: false,
  trial_available: false,
  trial_used_at: null,
  trial_ends_at: null,
  current_period_end: null,
  provider: "system_default",
  limits: { photo_analysis: 10, ai_request: 20 },
  usage: { photo_analysis: 0, ai_request: 0 },
  remaining: { photo_analysis: 10, ai_request: 20 },
  can_photo_analysis: true,
  can_ai_request: true,
};

export async function subscriptionAccess(chatId: number): Promise<SubscriptionAccess> {
  const db = getSupabaseAdmin();
  const { data, error } = await db.rpc("subscription_access_v1", { _chat_id: chatId });
  if (error || !data) {
    console.error("subscription access lookup failed", {
      chatId,
      code: error?.code,
      message: error?.message,
    });
    return {
      chat_id: chatId,
      period_start: new Date().toISOString(),
      ...BASIC_FALLBACK,
      can_photo_analysis: false,
      can_ai_request: false,
    };
  }
  return data as SubscriptionAccess;
}

export async function hasPremiumAccess(chatId: number) {
  return (await subscriptionAccess(chatId)).premium;
}
