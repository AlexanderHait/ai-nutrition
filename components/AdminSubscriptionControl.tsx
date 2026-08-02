"use client";

import { useState } from "react";
import TimelinePanel from "@/components/TimelinePanel";

export type SubscriptionPlan = "none" | "basic" | "premium";

export default function AdminSubscriptionControl({
  chatId,
  currentPlan = "none",
  compact = false,
}: {
  chatId: number | string;
  currentPlan?: SubscriptionPlan | null;
  compact?: boolean;
}) {
  const [plan, setPlan] = useState<SubscriptionPlan>(currentPlan ?? "none");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function changePlan(nextPlan: SubscriptionPlan) {
    if (saving || nextPlan === plan) return;
    const previous = plan;
    setPlan(nextPlan);
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/admin/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, plan: nextPlan }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Ошибка");
    } catch (e) {
      setPlan(previous);
      setError(e instanceof Error ? e.message : "Не удалось изменить подписку");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={compact ? "subscriptionControl compact" : "subscriptionControl"}>
      {!compact ? <div className="subscriptionControlLabel">Подписка</div> : null}
      <div className="subscriptionControlButtons">
        {[
          ["none", "Без подписки"],
          ["basic", "Basic"],
          ["premium", "Premium"],
        ].map(([value, label]) => {
          const active = plan === value;
          return (
            <button
              key={value}
              disabled={saving}
              onClick={() => changePlan(value as SubscriptionPlan)}
              className={active ? "active" : ""}
              type="button"
            >
              {label}
            </button>
          );
        })}
      </div>
      {error ? <div className="subscriptionControlError">{error}</div> : null}
      {!compact ? <TimelinePanel chatId={Number(chatId)} embedded /> : null}
    </div>
  );
}
