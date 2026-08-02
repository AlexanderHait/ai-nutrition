export type TimelineRow = {
  id: number | string;
  event_type: string;
  event_at: string;
  title: string;
  description?: string | null;
  payload?: Record<string, unknown> | null;
};

const MAP: Record<string, { category: string; icon: string; priority: number }> = {
  meal_saved: { category: "nutrition", icon: "🍽️", priority: 30 },
  nutrition_event: { category: "nutrition", icon: "🥗", priority: 35 },
  meal_deleted: { category: "nutrition", icon: "↩️", priority: 20 },
  weight_logged: { category: "weight", icon: "⚖️", priority: 40 },
  recommendation_created: { category: "recommendation", icon: "💡", priority: 50 },
  recommendation_feedback: { category: "recommendation", icon: "✅", priority: 55 },
  strategy_proposed: { category: "strategy", icon: "🎯", priority: 70 },
  strategy_applied: { category: "strategy", icon: "✅", priority: 75 },
  strategy_dismissed: { category: "strategy", icon: "↩️", priority: 60 },
  risk_detected: { category: "risk", icon: "⚠️", priority: 90 },
  subscription_changed: { category: "strategy", icon: "👑", priority: 25 },
  profile_created: { category: "strategy", icon: "👤", priority: 10 },
};

function statusFrom(row: TimelineRow) {
  const payload = row.payload || {};
  const raw = payload.status || payload.state || payload.outcome || payload.feedback;
  return typeof raw === "string" ? raw : undefined;
}

export function mapTimelineRow(row: TimelineRow) {
  const mapped = MAP[row.event_type] || { category: "strategy", icon: "•", priority: 10 };
  return {
    id: String(row.id),
    category: mapped.category,
    type: row.event_type,
    occurred_at: row.event_at,
    title: row.title,
    description: row.description || undefined,
    priority: mapped.priority,
    status: statusFrom(row),
    icon: mapped.icon,
    payload: row.payload || {},
  };
}
