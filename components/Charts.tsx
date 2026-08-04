// Визуальные блоки для кабинета: кольцо калорий, недельные столбцы и
// линия веса. Всё на CSS и SVG — без библиотек и без клиентского JS.

export const chartsCss = String.raw`
.kcalRingWrap{display:grid;grid-template-columns:auto minmax(0,1fr);gap:18px;align-items:center}
.kcalRing{
  position:relative;width:132px;height:132px;border-radius:50%;flex:none;
  background:conic-gradient(var(--ring-color,#d8b85f) var(--progress,0%),#1c1e23 0);
}
.kcalRing:after{content:"";position:absolute;inset:11px;border-radius:50%;background:#0e0f12}
.kcalRing>div{position:absolute;inset:0;display:grid;place-content:center;text-align:center;z-index:1}
.kcalRing b{display:block;font-size:26px;line-height:1.05;letter-spacing:-.6px}
.kcalRing small{display:block;margin-top:3px;font-size:12.5px;color:#83867f}
.kcalRingSide{display:grid;gap:9px;min-width:0}
.kcalRingSide>b{font-size:15px;line-height:1.3}
.kcalRingSide>span{font-size:13px;color:#8a8d88}

.macroRows{display:grid;gap:10px}
.macroRow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 10px;align-items:baseline}
.macroRow>span{font-size:13px;color:#9a9d98}
.macroRow>b{font-size:13.5px;white-space:nowrap}
.macroRow>i{grid-column:1/3;display:block;height:7px;border-radius:99px;background:#1c1e23;overflow:hidden}
.macroRow>i>em{display:block;height:100%;border-radius:99px;transition:width .3s ease}
.macroRow.prot>i>em{background:linear-gradient(90deg,var(--acc-prot),#8fc4ee)}
.macroRow.fat>i>em{background:linear-gradient(90deg,var(--acc-fat),#efc48f)}
.macroRow.carb>i>em{background:linear-gradient(90deg,var(--acc-carb),#a5ddc0)}
.macroRow.over>i>em{background:linear-gradient(90deg,var(--acc-bad),#e09a8c)}

.weekChart{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px;align-items:end;height:132px;position:relative}
.weekCol{display:grid;grid-template-rows:1fr auto auto;gap:5px;height:100%;align-items:end;text-align:center;min-width:0}
.weekBarTrack{position:relative;height:100%;border-radius:8px;background:#141519;display:flex;align-items:flex-end;overflow:hidden}
.weekBar{width:100%;border-radius:8px 8px 0 0;background:linear-gradient(180deg,#d8b85f,#a8894a);transition:height .3s ease}
.weekBar.over{background:linear-gradient(180deg,var(--acc-bad),#a35b4f)}
.weekBar.empty{background:#20222700}
.weekCol small{font-size:12.5px;color:#7d817c}
.weekCol em{font-size:12.5px;font-style:normal;color:#a9aca6}
.weekTargetLine{position:absolute;left:0;right:0;height:0;border-top:1px dashed #575a4a;pointer-events:none;z-index:1}

.trendCard{display:grid;gap:10px}
.trendSvg{width:100%;height:96px;display:block;overflow:visible}
.trendMeta{display:flex;justify-content:space-between;gap:12px;font-size:13px;color:#83867f}

@media(max-width:560px){
  .kcalRingWrap{grid-template-columns:1fr;justify-items:center;text-align:center}
  .kcalRingSide{justify-items:center}
  .weekChart{height:112px;gap:5px}
}
`;

export function CalorieRing({
  eaten,
  target,
  title,
  subtitle,
}: {
  eaten: number;
  target: number;
  title?: string;
  subtitle?: string;
}) {
  const pct = target > 0 ? Math.min(100, Math.round((eaten / target) * 100)) : 0;
  const over = target > 0 && eaten > target;
  const left = Math.round(target - eaten);
  return (
    <div className="kcalRingWrap">
      <div
        className="kcalRing"
        style={{
          "--progress": `${pct}%`,
          "--ring-color": over ? "var(--acc-bad)" : "var(--acc-good)",
        } as React.CSSProperties}
      >
        <div>
          <b>{Math.round(eaten)}</b>
          <small>из {Math.round(target) || "—"} ккал</small>
        </div>
      </div>
      <div className="kcalRingSide">
        <b>{title ?? (over ? `Выше цели на ${Math.abs(left)} ккал` : `Осталось ${Math.max(0, left)} ккал`)}</b>
        {subtitle ? <span>{subtitle}</span> : null}
      </div>
    </div>
  );
}

export function MacroRows({
  rows,
}: {
  rows: Array<{ key: "prot" | "fat" | "carb"; label: string; value: number; target: number }>;
}) {
  return (
    <div className="macroRows">
      {rows.map((row) => {
        const pct = row.target > 0 ? Math.round((row.value / row.target) * 100) : 0;
        const over = pct > 110;
        return (
          <div className={`macroRow ${row.key}${over ? " over" : ""}`} key={row.key}>
            <span>{row.label}</span>
            <b>
              {row.value.toFixed(1)} г
              {row.target > 0 ? <span style={{ color: "#757873" }}> · {pct}%</span> : null}
            </b>
            <i><em style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} /></i>
          </div>
        );
      })}
    </div>
  );
}

export function WeekBars({
  days,
  target,
}: {
  days: Array<{ day: string; kcal: number; label: string }>;
  target: number;
}) {
  const max = Math.max(target || 0, 1, ...days.map((day) => day.kcal)) * 1.08;
  return (
    <div className="weekChart">
      {target > 0 ? (
        <div className="weekTargetLine" style={{ bottom: `calc(${(target / max) * 100}% - 26px)` }} />
      ) : null}
      {days.map((day) => {
        const height = day.kcal > 0 ? Math.max(4, (day.kcal / max) * 100) : 0;
        const over = target > 0 && day.kcal > target;
        return (
          <div className="weekCol" key={day.day}>
            <div className="weekBarTrack">
              <div
                className={`weekBar${over ? " over" : ""}${day.kcal ? "" : " empty"}`}
                style={{ height: `${height}%` }}
              />
            </div>
            <em>{day.kcal ? Math.round(day.kcal) : "—"}</em>
            <small>{day.label}</small>
          </div>
        );
      })}
    </div>
  );
}

export function WeightTrend({
  points,
}: {
  points: Array<{ date: string; kg: number }>;
}) {
  if (points.length < 2) {
    return <p className="muted" style={{ margin: 0, fontSize: 13 }}>Нужно минимум два измерения, чтобы построить линию.</p>;
  }
  const values = points.map((point) => point.kg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const width = 100;
  const height = 34;
  const coords = points.map((point, index) => {
    const x = (index / (points.length - 1)) * width;
    const y = height - ((point.kg - min) / span) * height;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const delta = values[values.length - 1] - values[0];

  return (
    <div className="trendCard">
      <svg className="trendSvg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden>
        <polyline
          points={`0,${height} ${coords.join(" ")} ${width},${height}`}
          fill="rgba(92,176,196,.12)"
          stroke="none"
        />
        <polyline
          points={coords.join(" ")}
          fill="none"
          stroke="var(--acc-info)"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="trendMeta">
        <span>{points[0].date} · {values[0].toFixed(1)} кг</span>
        <span style={{ color: delta === 0 ? undefined : delta < 0 ? "var(--acc-good)" : "var(--acc-warn)" }}>
          {delta > 0 ? "+" : ""}{delta.toFixed(1)} кг
        </span>
        <span>{points[points.length - 1].date} · {values[values.length - 1].toFixed(1)} кг</span>
      </div>
    </div>
  );
}
