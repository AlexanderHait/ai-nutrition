"use client";

import { useState } from "react";

export type SubscriptionPlan = "none" | "basic" | "premium";

export default function AdminSubscriptionControl({
  chatId,
  currentPlan = "none",
}: {
  chatId: number | string;
  currentPlan?: SubscriptionPlan | null;
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
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ fontSize: 13, opacity: 0.65 }}>Подписка</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
              style={{
                padding: "8px 14px",
                borderRadius: 12,
                border: active ? "2px solid currentColor" : "1px solid #9995",
                background: "transparent",
                color: "inherit",
                fontWeight: active ? 700 : 500,
                cursor: saving ? "default" : "pointer",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
      {error ? <div style={{ color: "#d33", fontSize: 13 }}>{error}</div> : null}
    </div>
  );
}
