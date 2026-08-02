import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type CoachScore = {
  chat_id: number;
  score: number | null;
  nutrition_quality: number | null;
  stability: number | null;
  recommendation_adherence: number | null;
  active_days: number;
  period_days: number;
  recommendation_samples: number;
  confidence: number | null;
  trend: number | null;
  target_count: number;
  data_status: "no_data" | "setup_required" | "preliminary" | "growing" | "reliable";
  calculated_at: string;
};

export async function coachScore(chatId: number, days = 7): Promise<CoachScore | null> {
  const db = getSupabaseAdmin();
  const { data, error } = await db.rpc("coach_score_v2", {
    _chat_id: chatId,
    _days: days,
  });
  if (error) {
    console.error("coach score lookup failed", {
      chatId,
      code: error.code,
      message: error.message,
    });
    return null;
  }
  return (data || null) as CoachScore | null;
}

export async function coachScores(chatIds: number[], days = 7): Promise<CoachScore[]> {
  if (!chatIds.length) return [];
  const db = getSupabaseAdmin();
  const { data, error } = await db.rpc("coach_scores_v2", {
    _chat_ids: chatIds,
    _days: days,
  });
  if (error) {
    console.error("coach scores lookup failed", {
      clients: chatIds.length,
      code: error.code,
      message: error.message,
    });
    return [];
  }
  return (data || []) as CoachScore[];
}
