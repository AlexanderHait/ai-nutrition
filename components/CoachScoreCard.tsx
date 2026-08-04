import { Activity, BrainCircuit, CheckCircle2, Target, TrendingDown, TrendingUp } from "lucide-react";
import type { CoachScore } from "@/lib/coach-score";

function statusText(score: CoachScore | null) {
  if (!score || score.data_status === "no_data") return "Появится после первого дня питания.";
  if (score.data_status === "setup_required") return "Заполни цели КБЖУ — без них качество питания нельзя оценить честно.";
  if (score.data_status === "preliminary") return `Предварительная оценка: ${score.active_days} из ${score.period_days} дней с рационом.`;
  if (score.data_status === "growing") return `Точность растёт: ${score.active_days} из ${score.period_days} дней с рационом.`;
  return `Надёжный расчёт: ${score.active_days} из ${score.period_days} дней с рационом.`;
}

function scoreLabel(value: number | null) {
  if (value == null) return "Нет оценки";
  if (value >= 85) return "Отличный ритм";
  if (value >= 70) return "Хороший результат";
  if (value >= 50) return "Есть что улучшить";
  return "Нужна корректировка";
}

function Metric({ label, value, note }: { label: string; value: number | null; note: string }) {
  const width = value == null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
        <span>{label}</span>
        <b>{value == null ? "—" : `${value}%`}</b>
      </div>
      <div style={{ height: 7, borderRadius: 999, background: "rgba(148,163,184,.16)", overflow: "hidden" }}>
        <i style={{ display: "block", height: "100%", width: `${width}%`, borderRadius: 999, background: "linear-gradient(90deg,#6366f1,#22c55e)" }} />
      </div>
      <small className="muted">{note}</small>
    </div>
  );
}

export default function CoachScoreCard({ score, compact = false }: { score: CoachScore | null; compact?: boolean }) {
  const value = score?.score ?? null;
  const confidence = score?.confidence ?? null;
  const trend = score?.trend ?? null;
  const ringValue = value == null ? 0 : value;

  return (
    <section className="card" style={{ padding: compact ? 18 : 22 }}>
      <div className="sectionTitleRow">
        <div>
          <h2>AI Coach Score</h2>
          <span className="muted">Качество питания, стабильность и выполнение рекомендаций.</span>
        </div>
        <BrainCircuit size={20} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: compact ? "repeat(auto-fit,minmax(140px,1fr))" : "repeat(auto-fit,minmax(210px,1fr))", gap: 22, alignItems: "center", marginTop: 18 }}>
        <div
          style={{
            width: compact ? 104 : 132,
            height: compact ? 104 : 132,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            justifySelf: "center",
            background: `conic-gradient(#6366f1 ${ringValue}%, rgba(148,163,184,.15) 0)`,
            position: "relative",
          }}
        >
          <div style={{ width: "78%", height: "78%", borderRadius: "50%", background: "var(--panel)", display: "grid", placeItems: "center", textAlign: "center" }}>
            <span><b style={{ display: "block", fontSize: compact ? 25 : 32 }}>{value == null ? "—" : value}</b><small>/ 100</small></span>
          </div>
        </div>

        <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap" }}>
            <b>{scoreLabel(value)}</b>
            {trend != null ? (
              <span style={{ display: "inline-flex", gap: 4, alignItems: "center", fontSize: 13, opacity: .8 }}>
                {trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {trend > 0 ? "+" : ""}{trend} за неделю
              </span>
            ) : null}
          </div>
          <p className="muted" style={{ margin: 0, lineHeight: 1.5 }}>{statusText(score)}</p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 13, opacity: .78 }}>
            <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}><Activity size={13} /> {score?.active_days ?? 0}/{score?.period_days ?? 7} дней</span>
            <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}><CheckCircle2 size={13} /> уверенность {confidence == null ? "—" : `${confidence}%`}</span>
          </div>
        </div>
      </div>

      {!compact ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 18, marginTop: 22 }}>
          <Metric label="Качество питания" value={score?.nutrition_quality ?? null} note="Попадание в персональные цели КБЖУ." />
          <Metric label="Стабильность" value={score?.stability ?? null} note="Регулярность записей и ровность рациона." />
          <Metric label="Выполнение рекомендаций" value={score?.recommendation_adherence ?? null} note={score?.recommendation_samples ? `${score.recommendation_samples} подтверждённых решений за 30 дней.` : "Появится после обратной связи на советы."} />
        </div>
      ) : null}

      {score?.data_status === "setup_required" ? (
        <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}><Target size={15} /> Сначала нужны персональные цели КБЖУ.</div>
      ) : null}
    </section>
  );
}
