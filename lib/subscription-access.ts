import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type SubscriptionAccess = {
  account_id?: string;
  chat_id: number | null;
  plan: "basic" | "premium";
  state: "trial" | "active" | "grace";
  premium: boolean;
  trial_available: boolean;
  trial_used_at: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  provider: string | null;
  period_start: string;
  limits: { photo_analysis: number | null; ai_request: number | null };
  usage: { photo_analysis: number; ai_request: number };
  remaining: { photo_analysis: number | null; ai_request: number | null };
  can_photo_analysis: boolean;
  can_ai_request: boolean;
};

const BASIC_FALLBACK: Omit<SubscriptionAccess, "account_id" | "chat_id" | "period_start"> = {
  plan: "basic",
  state: "active",
  premium: false,
  trial_available: true,
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

export async function subscriptionAccess(identity: string | number): Promise<SubscriptionAccess> {
  const db = getSupabaseAdmin();
  const byAccount = typeof identity === "string";
  const { data, error } = byAccount
    ? await db.rpc("subscription_access_account_v1", { _account_id: identity })
    : await db.rpc("subscription_access_v1", { _chat_id: identity });

  if (error || !data) {
    console.error("subscription access lookup failed", {
      identity,
      code: error?.code,
      message: error?.message,
    });
    return {
      account_id: byAccount ? identity : undefined,
      chat_id: byAccount ? null : Number(identity),
      period_start: new Date().toISOString(),
      ...BASIC_FALLBACK,
      can_photo_analysis: false,
      can_ai_request: false,
    };
  }
  return data as SubscriptionAccess;
}

export async function hasPremiumAccess(identity: string | number) {
  return (await subscriptionAccess(identity)).premium;
}
