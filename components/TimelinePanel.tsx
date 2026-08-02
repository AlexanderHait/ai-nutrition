"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Clock3, RefreshCw } from "lucide-react";

type TimelineEvent = {
  id: string;
  category: string;
  type: string;
  occurred_at: string;
  title: string;
  description?: string;
  priority?: number;
  status?: string;
  icon?: string;
  payload?: Record<string, unknown>;
};

type TimelineResponse = {
  ok: boolean;
  events?: TimelineEvent[];
  summary?: {
    total?: number;
    pending_strategy?: number;
    current_subscription?: { plan?: string; state?: string; current_period_end?: string | null } | null;
  };
};

const FILTERS = [
  ["all", "Все"],
  ["nutrition", "Питание"],
  ["weight", "Вес"],
  ["recommendation", "Рекомендации"],
  ["risk", "Риски"],
  ["strategy", "Стратегия"],
] as const;

function dateKey(value: string) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Moscow" }).format(new Date(value));
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Moscow",
  }).format(new Date(`${value}T12:00:00+03:00`));
}

function timeLabel(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  }).format(new Date(value));
}

function statusLabel(status?: string) {
  const value = String(status || "").toLowerCase();
  const labels: Record<string, string> = {
    proposed: "Ожидает решения",
    pending: "Ожидает решения",
    active: "Активно",
    resolved: "Выполнено",
    applied: "Применено",
    accepted: "Подтверждено",
    rejected: "Отклонено",
    dismissed: "Отклонено",
    recorded: "Записано",
  };
  return labels[value] || "";
}

export default function TimelinePanel({
  chatId,
  embedded = false,
}: {
  chatId?: number;
  embedded?: boolean;
}) {
  const [data, setData] = useState<TimelineResponse | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ limit: embedded ? "60" : "100" });
      if (chatId) query.set("chat_id", String(chatId));
      const response = await fetch(`/api/timeline?${query}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as TimelineResponse | null;
      if (!response.ok || !payload?.ok) throw new Error("Не удалось загрузить историю");
      setData(payload);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось загрузить историю");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  const events = useMemo(() => {
    const rows = data?.events || [];
    return filter === "all" ? rows : rows.filter((event) => event.category === filter);
  }, [data, filter]);

  const groups = useMemo(() => {
    const map = new Map<string, TimelineEvent[]>();
    for (const event of events) {
      const key = dateKey(event.occurred_at);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(event);
    }
    return [...map.entries()];
  }, [events]);

  const shellStyle: React.CSSProperties = embedded
    ? { marginTop: 22, borderTop: "1px solid rgba(148,163,184,.18)", paddingTop: 20 }
    : {};

  return (
    <section style={shellStyle} aria-busy={loading}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>История TeddY</h2>
          <span className="muted">Питание, вес, рекомендации, риски и решения по датам.</span>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="secondaryBtn"
          style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
        >
          <RefreshCw size={15} /> Обновить
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "16px 0 8px" }}>
        {FILTERS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            style={{
              whiteSpace: "nowrap",
              border: "1px solid rgba(148,163,184,.25)",
              borderRadius: 999,
              padding: "8px 12px",
              background: filter === value ? "rgba(99,102,241,.2)" : "transparent",
              color: "inherit",
              cursor: "pointer",
              fontWeight: filter === value ? 700 : 500,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? <p className="muted">Загружаю историю…</p> : null}
      {error ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center", color: "#ef7777", padding: "14px 0" }}>
          <AlertTriangle size={17} /> {error}
        </div>
      ) : null}
      {!loading && !error && !events.length ? <p className="muted">Событий по этому фильтру пока нет.</p> : null}

      <div style={{ display: "grid", gap: 20, marginTop: 10 }}>
        {groups.map(([day, rows]) => (
          <section key={day}>
            <h3 style={{ margin: "0 0 9px", fontSize: 14, opacity: 0.72, textTransform: "capitalize" }}>
              {dateLabel(day)}
            </h3>
            <div style={{ display: "grid", gap: 9 }}>
              {rows.map((event) => {
                const important = event.category === "risk" || event.category === "strategy";
                const compact = event.category === "nutrition" && event.type === "meal_session";
                const state = statusLabel(event.status);
                return (
                  <article
                    key={event.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "34px minmax(0,1fr)",
                      gap: 10,
                      padding: compact ? "10px 12px" : "14px",
                      borderRadius: 16,
                      border: important
                        ? "1px solid rgba(245,158,11,.45)"
                        : "1px solid rgba(148,163,184,.16)",
                      background: important ? "rgba(245,158,11,.07)" : "rgba(148,163,184,.045)",
                    }}
                  >
                    <div style={{ fontSize: 19, lineHeight: "28px", textAlign: "center" }}>{event.icon || "•"}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                        <b style={{ fontSize: compact ? 13 : 14 }}>{event.title}</b>
                        <time style={{ fontSize: 11, opacity: 0.55, whiteSpace: "nowrap", display: "inline-flex", gap: 4, alignItems: "center" }}>
                          <Clock3 size={11} /> {timeLabel(event.occurred_at)}
                        </time>
                      </div>
                      {event.description ? (
                        <p style={{ margin: "5px 0 0", fontSize: compact ? 12 : 13, lineHeight: 1.48, opacity: 0.82 }}>
                          {event.description}
                        </p>
                      ) : null}
                      {state ? (
                        <span style={{ display: "inline-block", marginTop: 7, fontSize: 10, fontWeight: 700, opacity: 0.66 }}>
                          {state}
                        </span>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
