export type SubscriptionPlan = "none" | "basic" | "premium";

export function normalizeSubscriptionPlan(value: unknown): SubscriptionPlan {
  const v = String(value ?? "").toLowerCase();
  return v === "basic" || v === "premium" ? v : "none";
}
