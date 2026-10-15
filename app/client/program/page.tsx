import Link from "next/link";
import { AlertTriangle, CalendarRange, CheckCircle2, Flag, RefreshCw, Scale, Target } from "lucide-react";
import { requireClient } from "@/lib/auth";
import { clientSettingsAccountData } from "@/lib/account-data";
import { dayKey, fmt } from "@/lib/data";
import {
  GOAL_LABELS,
  addDays,
  buildProgram,
  daysBetween,
  formatDay,
  isDay,
  planFromRow,
  programGoalFromLabel,
  programInputFromSettings,
  programProfileMissing,
  programSignals,
  reviewWeeks,
  weekTargetsFor,
  type Adherence,
  type ProblemCode,
  type ProgramGoal,
  type ProgramPlan,
  type ProgramWeek,
  type WeekReview,
  type WeightState,
} from "@/lib/goal-program";
import { activeProgramAccountData, latestWeightAccountData, programFactsAccountData, type StoredProgram } from "@/lib/program-data";

export const dynamic = "force-dynamic";

type OkPlan = Extract<ProgramPlan, { ok: true }>;
type Settings = Record<string, unknown> | null | undefined;
type Latest = { kg: number; day: string } | null;
type Query = {
  goal?: string;
  target_weight?: string;
  target_day?: string;
  rebuild?: string;
  error?: string;
  started?: string;
  rebuilt?: string;
  applied?: string;
  stopped?: string;
  weighed?: string;
};

const MIN_DAYS = 28;
const MAX_DAYS = 78 * 7;

const ERRORS: Record<string, string> = {
  exists: "Программа уже идёт — вторая не создаётся. Её можно пересобрать или завершить ниже.",
  changed: "Программу уже изменили в другой вкладке. Здесь показано, как она выглядит сейчас.",
  save: "Не удалось сохранить. Данные верные — это сбой на нашей стороне, попробуй ещё раз.",
  targets: "Ориентиры не записались в профиль. Нажми «Применить ориентиры недели».",
  unavailable: "Раздел ещё готовится и скоро заработает.",
  fields: "Проверь цель, вес и дату. Ничего не было сохранено.",
  format: "Эту программу не удалось пересчитать. Заверши её и создай новую.",
  weight: "Вес не записан. Проверь число: от 30 до 400 кг.",
};

const ADHERENCE: Record<Adherence, { label: string; tone: string }> = {
  on_plan: { label: "в плане", tone: "good" },
  near_plan: { label: "рядом с планом", tone: "warn" },
  off_plan: { label: "мимо плана", tone: "bad" },
  little_data: { label: "мало записей", tone: "muted" },
  no_data: { label: "нет записей", tone: "muted" },
};

// «Быстрее плана» — не похвала: слишком быстрое снижение или набор вредны.
const WEIGHT: Record<WeightState, { label: string; tone: string }> = {
  ahead: { label: "быстрее плана", tone: "info" },
  on_track: { label: "по плану", tone: "good" },
  behind: { label: "отстаёт", tone: "warn" },
  off_band: { label: "вне коридора", tone: "warn" },
  unknown: { label: "нет взвешивания", tone: "muted" },
};

// Ошибки, при которых пересборка с той же целью невозможна: цель уже достигнута
// или больше не подходит — нужна новая программа.
const GOAL_CHANGED: readonly ProblemCode[] = ["direction", "too_small", "target_underweight", "target_range", "weight_range", "low_energy", "age"];
const MISSING_INPUT: readonly ProblemCode[] = ["profile", "date", "target_range"];

const css = `
.gpIntro{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:12px}
.gpIntro div{padding:12px;border:1px solid var(--line);border-radius:13px;background:var(--surface)}
.gpIntro i{display:grid;place-items:center;width:28px;height:28px;margin-bottom:8px;border-radius:9px;background:var(--accent-soft);color:var(--gold);font-style:normal;font-weight:800;font-size:13px}
.gpIntro b{display:block;font-size:13px}.gpIntro small{display:block;margin-top:3px;color:var(--muted);font-size:12.5px;line-height:1.4}
.gpEmpty{display:grid;justify-items:center;gap:8px;padding:26px 18px;text-align:center}
.gpEmpty svg{color:var(--gold)}.gpEmpty b{font-size:14px}.gpEmpty span{max-width:440px;color:var(--muted);font-size:13px;line-height:1.5}
.gpForm{display:grid;gap:12px}
.gpForm label{display:grid;gap:7px;color:var(--muted);font-size:13px}
.gpGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}
.gpGoal{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.gpGoal label{position:relative}.gpGoal input{position:absolute;opacity:0;pointer-events:none}
.gpGoal span{display:block;padding:13px 10px;border:1px solid var(--line2);border-radius:12px;background:var(--bg);text-align:center;font-weight:750;color:var(--text);cursor:pointer}
.gpGoal input:checked+span{border-color:var(--gold);background:var(--accent-soft);color:var(--gold)}
.gpGoal input:focus-visible+span{outline:2px solid var(--gold);outline-offset:2px}
.gpHint{display:block;color:var(--muted2);font-size:12.5px;line-height:1.45}
.gpActions{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:flex-end}
.gpSummary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:4px 0 14px}
.gpSummary div{padding:11px 12px;border:1px solid var(--line);border-radius:12px;background:var(--bg)}
.gpSummary small{display:block;color:var(--muted);font-size:12.5px}.gpSummary b{display:block;margin-top:3px;font-size:17px}
.gpStrip{display:flex;gap:2px;margin:6px 0 10px}
.gpStrip span{flex-basis:0;min-width:0;height:10px;border-radius:5px;background:var(--line2)}
.gpStrip span.main{background:var(--gold)}.gpStrip span.entry{background:color-mix(in srgb,var(--gold) 55%,var(--line2))}
.gpStrip span.break,.gpStrip span.hold{background:color-mix(in srgb,var(--acc-info) 55%,var(--line2))}
.gpStrip span.now{outline:2px solid var(--text);outline-offset:2px}
.gpPhases{display:grid;gap:8px}
.gpPhase{display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:start}
.gpPhase i{width:10px;height:10px;margin-top:5px;border-radius:5px;background:var(--line2)}
.gpPhase i.main{background:var(--gold)}.gpPhase i.entry{background:color-mix(in srgb,var(--gold) 55%,var(--line2))}
.gpPhase i.break,.gpPhase i.hold{background:color-mix(in srgb,var(--acc-info) 55%,var(--line2))}
.gpPhase b{font-size:13.5px}.gpPhase small{display:block;color:var(--muted);font-size:12.5px;line-height:1.45}
.gpWeeks{display:grid;gap:6px}
.gpWeek{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr);gap:10px;align-items:center;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--bg)}
.gpWeek.current{border-color:var(--gold2);background:var(--accent-soft)}
.gpWeek.future{border-style:dashed;background:transparent}
.gpWeek b{display:block;font-size:13px}.gpWeek small{display:block;color:var(--muted);font-size:12.5px;line-height:1.4}
.gpChip{display:inline-block;margin-top:3px;padding:2px 8px;border-radius:99px;border:1px solid var(--line2);color:var(--muted);font-size:12.5px;font-weight:700}
.gpChip.good{border-color:color-mix(in srgb,var(--acc-good) 50%,transparent);color:var(--acc-good)}
.gpChip.warn{border-color:color-mix(in srgb,var(--acc-warn) 50%,transparent);color:var(--acc-warn)}
.gpChip.bad{border-color:color-mix(in srgb,var(--acc-bad) 50%,transparent);color:var(--acc-bad)}
.gpChip.info{border-color:color-mix(in srgb,var(--acc-info) 50%,transparent);color:var(--acc-info)}
.gpTargets{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.gpTargets div{padding:11px 12px;border:1px solid var(--line);border-radius:12px;background:var(--bg)}
.gpTargets small{display:block;color:var(--muted);font-size:12.5px}.gpTargets b{display:block;margin-top:3px;font-size:18px}
.gpSignal{display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:start;padding:12px 13px;border:1px solid var(--line);border-radius:12px;background:var(--surface)}
.gpSignal.warn{border-color:color-mix(in srgb,var(--acc-warn) 45%,transparent)}
.gpSignal svg{margin-top:2px;color:var(--acc-warn)}.gpSignal.info svg{color:var(--acc-info)}
.gpSignal b{display:block;font-size:13.5px}.gpSignal span{display:block;margin-top:3px;color:var(--muted);font-size:13px;line-height:1.45}
.gpApply{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin-top:12px;padding:11px 12px;border:1px solid var(--gold2);border-radius:12px;background:var(--bg)}
.gpApply span{color:var(--muted);font-size:13px;line-height:1.45;max-width:560px}
.gpMore summary{cursor:pointer;color:var(--muted);font-size:13px;font-weight:700;padding:8px 2px}
.gpInline{display:flex;flex-wrap:wrap;gap:8px;align-items:end}
.gpInline label{display:grid;gap:6px;color:var(--muted);font-size:13px}
.gpConfirm{margin-top:12px}
.gpConfirm summary{display:inline-block;cursor:pointer;color:var(--muted);font-size:13px;font-weight:700;padding:8px 2px}
.gpConfirm form{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:6px;padding:11px 12px;border:1px solid var(--line);border-radius:12px;background:var(--bg)}
.gpConfirm form span{color:var(--muted);font-size:13px;line-height:1.45;max-width:520px}
.gpNote{margin-top:14px;color:var(--muted2);font-size:12.5px;line-height:1.5}
@media(max-width:760px){.gpIntro,.gpSummary,.gpTargets{grid-template-columns:repeat(2,minmax(0,1fr))}.gpGrid,.gpGoal{grid-template-columns:1fr}.gpWeek{grid-template-columns:1fr 1fr}.gpWeek>div:first-child{grid-column:1/-1}.gpActions{justify-content:stretch}.gpActions>*{flex:1}}
`;

function shortDay(day: string) {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" }).replace(".", "");
}

function rangeLabel(week: ProgramWeek) {
  return `${shortDay(week.startDay)} – ${shortDay(week.endDay)}`;
}

function signed(value: number) {
  return `${value > 0 ? "+" : ""}${fmt(value, 1)}`;
}

function plural(value: number, one: string, few: string, many: string) {
  const mod100 = value % 100;
  const mod10 = value % 10;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}
const weeksWord = (value: number) => plural(value, "неделя", "недели", "недель");
const daysWord = (value: number) => plural(value, "день", "дня", "дней");

function previewHref(goal: ProgramGoal, targetWeight: number | string, targetDay: string, rebuild = false) {
  const params = new URLSearchParams({ goal: GOAL_LABELS[goal], target_weight: String(targetWeight), target_day: targetDay });
  if (rebuild) params.set("rebuild", "1");
  return `/client/program?${params}#preview`;
}

// Дату ближе 4 недель браузер отправить не даст — такую в поле не подставляем.
function dateDefault(day: string | null | undefined, today: string) {
  return day && isDay(day) && daysBetween(today, day) >= MIN_DAYS && daysBetween(today, day) <= MAX_DAYS ? day : "";
}

export default async function Page({ searchParams }: { searchParams: Promise<Query> }) {
  const current = await requireClient();
  const accountId = current.accountId!;
  const query = await searchParams;
  const today = dayKey();

  const [active, settings, latest] = await Promise.all([
    activeProgramAccountData(accountId),
    clientSettingsAccountData(accountId),
    latestWeightAccountData(accountId),
  ]);

  return (
    <>
      <style>{css}</style>
      <Notices query={query} />
      {!active.available ? (
        <Unavailable />
      ) : active.program && query.rebuild === "1" ? (
        <RebuildPreview program={active.program} settings={settings} latest={latest} query={query} today={today} />
      ) : active.program ? (
        <ActiveProgram accountId={accountId} program={active.program} settings={settings} latest={latest} today={today} />
      ) : (
        <NewProgram settings={settings} latest={latest} query={query} today={today} />
      )}
      <p className="gpNote">Программа — ориентир по питанию, а не лечение. При заболеваниях, беременности и кормлении грудью меняй вес только вместе с врачом.</p>
    </>
  );
}

function Notices({ query }: { query: Query }) {
  const targetsFailed = query.error === "targets";
  return (
    <>
      {query.started === "1" ? <div className="successNotice"><CheckCircle2 size={17} /> {targetsFailed ? "Программа запущена." : "Программа запущена. Ориентиры первой недели уже в профиле — их видят бот и дневник."}</div> : null}
      {query.rebuilt === "1" ? <div className="successNotice"><CheckCircle2 size={17} /> {targetsFailed ? "Программа пересобрана от текущего веса." : "Программа пересобрана от текущего веса, ориентиры обновлены. Прошлая программа закрыта."}</div> : null}
      {query.applied === "1" ? <div className="successNotice"><CheckCircle2 size={17} /> Ориентиры недели записаны в профиль.</div> : null}
      {query.stopped === "1" ? <div className="successNotice"><CheckCircle2 size={17} /> Программа завершена. Ориентиры в профиле остались прежними.</div> : null}
      {query.weighed === "1" ? <div className="successNotice"><CheckCircle2 size={17} /> Вес записан.</div> : null}
      {query.error && ERRORS[query.error] ? <div className="errorNotice">{ERRORS[query.error]}</div> : null}
    </>
  );
}

function Unavailable() {
  return (
    <>
      <div className="pageHead"><div><p>Программа</p><h1>Программа к цели</h1><span>Раздел готовится и скоро заработает.</span></div></div>
      <section className="card gpEmpty"><Flag /><b>Скоро здесь появится программа</b><span>Цель и дата → этапы по неделям → ориентиры на каждую неделю → сверка плана с фактом.</span></section>
    </>
  );
}

function ProfileMissing() {
  return (
    <section className="card gpEmpty top">
      <Target />
      <b>Сначала нужна анкета</b>
      <span>Для расчёта программы нужны пол, возраст, рост, активность и текущий вес.</span>
      <Link className="primary compactBtn" href="/client/setup">Заполнить анкету</Link>
    </section>
  );
}

function QuickWeight() {
  return (
    <form className="gpInline" action="/api/client/weight" method="post" id="weigh">
      <input type="hidden" name="return" value="program" />
      <label>Вес сегодня, кг
        <input name="weight_kg" type="number" min="30" max="400" step="0.1" inputMode="decimal" placeholder="Например, 78.4" required />
      </label>
      <button className="secondaryBtn compactBtn" type="submit"><Scale size={16} /> Записать вес</button>
    </form>
  );
}

function WeightLine({ latest, today }: { latest: Latest; today: string }) {
  if (!latest) return <span className="gpHint">Взвешиваний нет — старт возьмём из анкеты. Точнее будет, если записать вес сегодня.</span>;
  const age = daysBetween(latest.day, today);
  return (
    <span className="gpHint">
      Старт от последнего взвешивания: {fmt(latest.kg, 1)} кг ({age <= 0 ? "сегодня" : formatDay(latest.day)}).
      {age > 7 ? ` Это было ${age} ${daysWord(age)} назад — запиши свежий вес, чтобы старт был точным.` : null}
    </span>
  );
}

function PhaseStrip({ plan, today }: { plan: OkPlan; today?: string }) {
  return (
    <>
      <div className="gpStrip" aria-hidden>
        {plan.weeks.map((week) => (
          <span
            key={week.index}
            className={`${week.phase}${today && today >= week.startDay && today <= week.endDay ? " now" : ""}`}
            style={{ flexGrow: week.days }}
          />
        ))}
      </div>
      <div className="gpPhases">
        {plan.phases.map((phase) => (
          <div className="gpPhase" key={`${phase.phase}-${phase.startDay}`}>
            <i className={phase.phase} />
            <div>
              <b>{phase.title} · {phase.weeks} {weeksWord(phase.weeks)}</b>
              <small>{shortDay(phase.startDay)} – {shortDay(phase.endDay)}. {phase.about}</small>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function PlanSummary({ plan }: { plan: OkPlan }) {
  const s = plan.summary;
  const preTarget = plan.weeks.filter((week) => !week.afterTarget).length;
  const first = plan.weeks[0];
  return (
    <div className="gpSummary">
      <div><small>Срок</small><b>{preTarget} {weeksWord(preTarget)}</b></div>
      <div><small>Изменение веса</small><b>{plan.goal === "maintain" ? "±1,5%" : `${signed(s.totalChangeKg)} кг`}</b></div>
      <div><small>Темп</small><b>{plan.goal === "maintain" ? "держим вес" : `${fmt(s.weeklyRateKg, 1)} кг/нед`}</b></div>
      <div><small>Первая неделя</small><b>{fmt(first.kcal)} ккал</b></div>
    </div>
  );
}

function PlanWeeks({ plan }: { plan: OkPlan }) {
  return (
    <div className="gpWeeks">
      {plan.weeks.map((week) => (
        <div className="gpWeek" key={week.index}>
          <div><b>Неделя {week.index} · {rangeLabel(week)}</b><small>{week.title}</small></div>
          <div><b>{fmt(week.kcal)} ккал</b><small>Б {week.protein} · Ж {week.fat} · У {week.carb}</small></div>
          <div><b>{fmt(week.plannedWeightEnd, 1)} кг</b><small>план к концу недели</small></div>
        </div>
      ))}
    </div>
  );
}

function ProblemCard({ plan, goal, targetWeight, targetDay, rebuild }: { plan: Extract<ProgramPlan, { ok: false }>; goal: ProgramGoal; targetWeight: number; targetDay: string; rebuild?: boolean }) {
  const { problem } = plan;
  const goalChanged = rebuild && GOAL_CHANGED.includes(problem.code);
  return (
    <section className="card top" id="preview">
      <div className="gpSignal warn">
        <AlertTriangle size={18} />
        <div>
          <b>{goalChanged ? "С этой целью программу не пересобрать" : MISSING_INPUT.includes(problem.code) ? "Не хватает данных" : "Такую программу не строим"}</b>
          <span>{problem.message}</span>
          {goalChanged ? <span>Похоже, цель уже достигнута или изменилась. Заверши эту программу и начни новую — например, удержание.</span> : null}
        </div>
      </div>
      <div className="gpActions top">
        {problem.code === "profile" ? <Link className="primary compactBtn" href="/client/setup">Заполнить анкету</Link> : null}
        {problem.suggestedTargetDay ? (
          <Link className="primary compactBtn" href={previewHref(goal, targetWeight, problem.suggestedTargetDay, rebuild)}>
            Показать программу к {formatDay(problem.suggestedTargetDay, true)}
          </Link>
        ) : null}
        {problem.minTargetWeightKg && !rebuild ? (
          <Link className="secondaryBtn compactBtn" href={previewHref(goal, problem.minTargetWeightKg, targetDay)}>
            Поставить {fmt(problem.minTargetWeightKg, 1)} кг
          </Link>
        ) : null}
      </div>
      {goalChanged ? <StopForm /> : null}
    </section>
  );
}

function NewProgram({ settings, latest, query, today }: { settings: Settings; latest: Latest; query: Query; today: string }) {
  const missing = programProfileMissing(settings, latest?.kg ?? null);
  const goal = programGoalFromLabel(query.goal) || programGoalFromLabel(settings?.goal) || "loss";
  const targetWeight = Number(String(query.target_weight ?? settings?.target_weight_kg ?? "").replace(",", "."));
  const targetDay = isDay(query.target_day) ? query.target_day : "";
  const requested = Boolean(query.goal || query.target_day);
  const plan = !missing && requested
    ? buildProgram(programInputFromSettings(settings, latest?.kg ?? null, { goal, targetWeightKg: targetWeight, targetDay: targetDay || null }, today))
    : null;

  return (
    <>
      <div className="pageHead">
        <div>
          <p>Программа</p>
          <h1>Дойти до цели к нужной дате</h1>
          <span>Выбери цель и дату — TeddY разложит путь на этапы, даст ориентиры на каждую неделю и будет сверять план с тем, как ты ешь и как меняется вес.</span>
        </div>
      </div>

      <div className="gpIntro">
        <div><i>1</i><b>Цель и дата</b><small>Куда и к какому дню</small></div>
        <div><i>2</i><b>Этапы</b><small>Мягкий вход, основной этап, паузы, закрепление</small></div>
        <div><i>3</i><b>Ориентиры недели</b><small>Калории и БЖУ под этап и текущий вес</small></div>
        <div><i>4</i><b>Факт и план</b><small>Каждая неделя: в плане или нет</small></div>
      </div>

      {missing ? <ProfileMissing /> : (
        <section className="card">
          <form className="gpForm" action="/client/program#preview" method="get">
            <div className="gpGoal" role="radiogroup" aria-label="Цель">
              {(["loss", "maintain", "gain"] as const).map((value) => (
                <label key={value}>
                  <input type="radio" name="goal" value={GOAL_LABELS[value]} defaultChecked={goal === value} required />
                  <span>{GOAL_LABELS[value]}</span>
                </label>
              ))}
            </div>
            <div className="gpGrid">
              <label>Целевой вес, кг
                <input name="target_weight" type="number" min="35" max="300" step="0.1" inputMode="decimal" defaultValue={Number.isFinite(targetWeight) && targetWeight > 0 ? targetWeight : ""} placeholder="Например, 72" />
              </label>
              <label>Дата цели
                <input name="target_day" type="date" min={addDays(today, MIN_DAYS)} max={addDays(today, MAX_DAYS)} defaultValue={targetDay} />
              </label>
            </div>
            <span className="gpHint">Дата — не раньше чем через 4 недели и не позже чем через полтора года. Для удержания целевой вес и дата не нужны: программа рассчитается на 12 недель.</span>
            <WeightLine latest={latest} today={today} />
            <div className="gpActions"><button className="primary compactBtn" type="submit"><CalendarRange size={17} /> Рассчитать программу</button></div>
          </form>
          <div className="top"><QuickWeight /></div>
        </section>
      )}

      {plan && !plan.ok ? <ProblemCard plan={plan} goal={goal} targetWeight={targetWeight} targetDay={targetDay} /> : null}
      {plan && plan.ok ? (
        <section className="card top" id="preview">
          <div className="sectionTitleRow"><div><h2>Твоя программа</h2><span className="muted">{GOAL_LABELS[plan.goal]} · до {formatDay(plan.summary.targetDay, true)}</span></div><Flag size={18} /></div>
          <PlanSummary plan={plan} />
          <PhaseStrip plan={plan} />
          <details className="gpMore top">
            <summary>Все недели ({plan.weeks.length})</summary>
            <PlanWeeks plan={plan} />
          </details>
          <form className="gpApply" action="/api/client/program" method="post">
            <input type="hidden" name="action" value="create" />
            <input type="hidden" name="goal" value={GOAL_LABELS[plan.goal]} />
            <input type="hidden" name="target_weight_kg" value={plan.summary.targetWeightKg} />
            <input type="hidden" name="target_day" value={plan.goal === "maintain" && !targetDay ? "" : plan.summary.targetDay} />
            <span>Калории и БЖУ первой недели сразу запишутся в профиль — их увидят бот и дневник. Цель и целевой вес в анкете не меняются. Дальше ориентиры меняются только по твоей кнопке.</span>
            <button className="primary compactBtn" type="submit"><Flag size={17} /> Начать программу</button>
          </form>
        </section>
      ) : null}
    </>
  );
}

function RebuildPreview({ program, settings, latest, query, today }: { program: StoredProgram; settings: Settings; latest: Latest; query: Query; today: string }) {
  const goal = programGoalFromLabel(program.goal_kind) || "maintain";
  const targetWeight = Number(program.target_weight_kg);
  const targetDay = isDay(query.target_day) ? query.target_day : dateDefault(String(program.target_day || "").slice(0, 10), today);
  const missing = programProfileMissing(settings, latest?.kg ?? null);
  const plan = missing ? null : buildProgram(programInputFromSettings(settings, latest?.kg ?? null, { goal, targetWeightKg: targetWeight, targetDay: targetDay || null }, today));

  return (
    <>
      <div className="pageHead">
        <div>
          <p>Программа</p>
          <h1>Пересборка от текущего веса</h1>
          <span>Старт — сегодня. Цель прежняя: {goal === "maintain" ? "удержание веса" : `${fmt(targetWeight, 1)} кг`}. Текущая программа закроется, когда ты подтвердишь новую.</span>
        </div>
        <Link className="secondaryBtn compactBtn" href="/client/program">Отмена</Link>
      </div>
      <section className="card">
        <form className="gpInline" action="/client/program#preview" method="get">
          <input type="hidden" name="rebuild" value="1" />
          <label>Дата цели
            <input name="target_day" type="date" min={addDays(today, MIN_DAYS)} max={addDays(today, MAX_DAYS)} defaultValue={targetDay} />
          </label>
          <button className="secondaryBtn compactBtn" type="submit">Пересчитать</button>
        </form>
        {!targetDay && goal !== "maintain" ? <span className="gpHint top">До прежней даты цели меньше 4 недель — выбери дату не раньше {formatDay(addDays(today, MIN_DAYS), true)}.</span> : null}
        <div className="top"><WeightLine latest={latest} today={today} /></div>
        <div className="top"><QuickWeight /></div>
      </section>
      {missing ? <ProfileMissing /> : null}
      {plan && !plan.ok ? <ProblemCard plan={plan} goal={goal} targetWeight={targetWeight} targetDay={targetDay} rebuild /> : null}
      {plan && plan.ok ? (
        <section className="card top" id="preview">
          <div className="sectionTitleRow"><div><h2>Новая программа</h2><span className="muted">до {formatDay(plan.summary.targetDay, true)}</span></div><RefreshCw size={18} /></div>
          <PlanSummary plan={plan} />
          <PhaseStrip plan={plan} />
          <form className="gpApply" action="/api/client/program" method="post">
            <input type="hidden" name="action" value="rebuild" />
            <input type="hidden" name="target_day" value={plan.summary.targetDay} />
            <span>Калории и БЖУ новой первой недели запишутся в профиль.</span>
            <button className="primary compactBtn" type="submit"><RefreshCw size={17} /> Пересобрать</button>
          </form>
        </section>
      ) : null}
    </>
  );
}

async function ActiveProgram({ accountId, program, settings, latest, today }: { accountId: string; program: StoredProgram; settings: Settings; latest: Latest; today: string }) {
  const plan = planFromRow(program);
  if (!plan || !plan.ok) {
    return (
      <>
        <div className="pageHead"><div><p>Программа</p><h1>Программу не удалось пересчитать</h1><span>Она сохранена, но в этой версии сайта её не прочитать. Заверши её и создай новую — данные питания и веса не пострадают.</span></div></div>
        <section className="card"><StopForm /></section>
      </>
    );
  }

  const finished = today > plan.summary.endDay;
  const factsTo = finished ? plan.summary.endDay : today;
  const { facts, weights } = await programFactsAccountData(accountId, plan.summary.startDay, factsTo);
  const reviews = reviewWeeks(plan, facts, weights, today);
  const signals = programSignals(plan, reviews, today);
  const targets = weekTargetsFor(plan, today);
  const currentReview = reviews.find((review) => review.status === "current") || null;
  const preTarget = plan.weeks.filter((week) => !week.afterTarget);
  const weekNumber = currentReview && !currentReview.week.afterTarget ? currentReview.week.index : null;
  const daysLeft = daysBetween(today, plan.summary.targetDay);

  const profileTargets = {
    kcal: Number(settings?.kcal_target || 0),
    protein: Number(settings?.protein_target || settings?.protein_target_g || 0),
    fat: Number(settings?.fat_target || settings?.fat_target_g || 0),
    carb: Number(settings?.carb_target || settings?.carb_target_g || 0),
  };
  const mismatch = !finished && (
    Math.abs(profileTargets.kcal - targets.kcal) >= 10
    || profileTargets.protein !== targets.protein
    || profileTargets.fat !== targets.fat
    || profileTargets.carb !== targets.carb
  );

  const title = plan.goal === "maintain"
    ? `Удержание: ${fmt(plan.summary.startWeightKg, 1)} кг`
    : `${GOAL_LABELS[plan.goal]}: ${fmt(plan.summary.startWeightKg, 1)} → ${fmt(plan.summary.targetWeightKg, 1)} кг`;
  const left = daysLeft <= 0 ? null : daysLeft < 7 ? `до цели ${daysLeft} ${daysWord(daysLeft)}` : `до цели ${Math.ceil(daysLeft / 7)} ${weeksWord(Math.ceil(daysLeft / 7))}`;
  const subtitle = finished
    ? `программа завершена ${formatDay(plan.summary.endDay, true)}`
    : [
        `к ${formatDay(plan.summary.targetDay, true)}`,
        weekNumber ? `неделя ${weekNumber} из ${preTarget.length}` : daysLeft <= 0 ? "закрепление" : null,
        left,
      ].filter(Boolean).join(" · ");

  // Показываем окно вокруг текущей недели, остальное — под спойлером.
  const currentIndex = currentReview ? reviews.indexOf(currentReview) : reviews.findIndex((review) => review.status === "future");
  const pivot = currentIndex < 0 ? reviews.length - 1 : currentIndex;
  const windowStart = Math.max(0, pivot - 3);
  const windowEnd = Math.min(reviews.length, pivot + 4);
  const visible = reviews.slice(windowStart, windowEnd);
  const hidden = [...reviews.slice(0, windowStart), ...reviews.slice(windowEnd)];

  return (
    <>
      <div className="pageHead">
        <div><p>Программа</p><h1>{title}</h1><span>{subtitle}</span></div>
        <a className="primary compactBtn" href="#weigh"><Scale size={16} /> Записать вес</a>
      </div>

      {signals.length ? (
        <div className="gpWeeks">
          {signals.map((signal) => (
            <div className={`gpSignal ${signal.tone}`} key={signal.code}>
              {signal.tone === "warn" ? <AlertTriangle size={18} /> : <Flag size={18} />}
              <div><b>{signal.title}</b><span>{signal.text}</span></div>
            </div>
          ))}
        </div>
      ) : null}

      {finished ? (
        <section className="card top gpEmpty">
          <CheckCircle2 />
          <b>Все этапы пройдены</b>
          <span>Сверка ниже сохранится, пока программа открыта. Заверши её, чтобы начать следующую — от текущего веса.</span>
          <StopForm open />
        </section>
      ) : (
        <section className="card top">
          <div className="sectionTitleRow">
            <div><h2>{targets.week.afterTarget ? "Закрепление" : `Эта неделя · ${targets.week.title}`}</h2><span className="muted">{rangeLabel(targets.week)}</span></div>
            <Target size={18} />
          </div>
          <div className="gpTargets">
            <div><small>Калории</small><b>{fmt(targets.kcal)}</b></div>
            <div><small>Белок</small><b>{targets.protein} г</b></div>
            <div><small>Жиры</small><b>{targets.fat} г</b></div>
            <div><small>Углеводы</small><b>{targets.carb} г</b></div>
          </div>
          {currentReview ? <WeekFacts review={currentReview} /> : null}
          {mismatch ? (
            <form className="gpApply" action="/api/client/program" method="post">
              <input type="hidden" name="action" value="apply" />
              <span>
                {profileTargets.kcal
                  ? `В профиле сейчас ${fmt(profileTargets.kcal)} ккал · Б ${fmt(profileTargets.protein)} · Ж ${fmt(profileTargets.fat)} · У ${fmt(profileTargets.carb)}`
                  : "В профиле пока нет ориентиров"} — бот и дневник считают по ним. Записать ориентиры этой недели?
              </span>
              <button className="primary compactBtn" type="submit">Применить ориентиры недели</button>
            </form>
          ) : <p className="gpHint top">Эти ориентиры уже стоят в профиле — по ним считают бот и дневник.</p>}
        </section>
      )}

      <section className="card top">
        <div className="sectionTitleRow"><div><h2>Этапы</h2><span className="muted">{finished ? "Программа пройдена" : "Обведена текущая неделя"}</span></div><CalendarRange size={18} /></div>
        <PhaseStrip plan={plan} today={today} />
      </section>

      <section className="card top">
        <div className="sectionTitleRow"><div><h2>Факт и план по неделям</h2><span className="muted">Калории — среднее по дням с полным дневником, сегодняшний день ещё не считается. Вес — последнее взвешивание недели и план на тот же день.</span></div><Flag size={18} /></div>
        <div className="gpWeeks">{visible.map((review) => <ReviewRow review={review} key={review.week.index} />)}</div>
        {hidden.length ? (
          <details className="gpMore top">
            <summary>Остальные недели ({hidden.length})</summary>
            <div className="gpWeeks">{hidden.map((review) => <ReviewRow review={review} key={review.week.index} />)}</div>
          </details>
        ) : null}
      </section>

      <section className="card top">
        <div className="sectionTitleRow"><div><h2>Вес и пересборка</h2><span className="muted">Пересборка начнётся от сегодняшнего дня и текущего веса</span></div><RefreshCw size={18} /></div>
        <QuickWeight />
        <div className="top"><WeightLine latest={latest} today={today} /></div>
        {!finished ? (
          <form className="gpInline top" action="/client/program#preview" method="get">
            <input type="hidden" name="rebuild" value="1" />
            <label>Дата цели
              <input name="target_day" type="date" min={addDays(today, MIN_DAYS)} max={addDays(today, MAX_DAYS)} defaultValue={dateDefault(plan.summary.targetDay, today)} />
            </label>
            <button className="secondaryBtn compactBtn" type="submit"><RefreshCw size={16} /> Пересобрать</button>
          </form>
        ) : null}
        {!finished ? <StopForm /> : null}
      </section>
    </>
  );
}

function WeekFacts({ review }: { review: WeekReview }) {
  const adherence = review.adherence ? ADHERENCE[review.adherence] : null;
  const weight = WEIGHT[review.weightState];
  return (
    <div className="gpWeek top">
      <div>
        <b>Факт за неделю</b>
        <small>{review.consideredDays ? `${review.loggedDays} из ${review.consideredDays} ${daysWord(review.consideredDays)} с полным дневником${review.partialDays ? `, неполных: ${review.partialDays}` : ""}` : "Неделя только началась"}</small>
      </div>
      <div>
        <b>{review.avgKcal != null ? `${fmt(review.avgKcal)} ккал` : "—"}</b>
        {adherence ? <span className={`gpChip ${adherence.tone}`}>{adherence.label}</span> : <small>в среднем за день</small>}
      </div>
      <div>
        <b>{review.weightKg != null ? `${fmt(review.weightKg, 1)} кг` : "—"}</b>
        {review.plannedWeightKg != null ? <small>план {fmt(review.plannedWeightKg, 1)} кг</small> : null}
        <span className={`gpChip ${weight.tone}`}>{weight.label}</span>
      </div>
    </div>
  );
}

function ReviewRow({ review }: { review: WeekReview }) {
  const { week } = review;
  const adherence = review.adherence ? ADHERENCE[review.adherence] : null;
  const weight = WEIGHT[review.weightState];
  const future = review.status === "future";
  return (
    <div className={`gpWeek ${review.status}`}>
      <div>
        <b>Неделя {week.index} · {rangeLabel(week)}</b>
        <small>{week.title}{review.status === "current" ? " · сейчас" : ""}</small>
      </div>
      <div>
        <b>{future ? `план ${fmt(week.kcal)} ккал` : `${review.avgKcal != null ? `${fmt(review.avgKcal)} ккал` : "—"}`}</b>
        {future ? <small>калории в день</small> : <small>план {fmt(week.kcal)} ккал</small>}
        {adherence ? <span className={`gpChip ${adherence.tone}`}>{adherence.label}</span> : null}
      </div>
      <div>
        <b>{future ? `план ${fmt(week.plannedWeightEnd, 1)} кг` : review.weightKg != null ? `${fmt(review.weightKg, 1)} кг` : "—"}</b>
        {future ? <small>к концу недели</small> : <small>план {fmt(review.plannedWeightKg ?? week.plannedWeightEnd, 1)} кг</small>}
        {future ? null : <span className={`gpChip ${weight.tone}`}>{weight.label}</span>}
      </div>
    </div>
  );
}

// Завершение — необратимо для человека, поэтому через подтверждение (без JavaScript).
function StopForm({ open = false }: { open?: boolean }) {
  return (
    <details className="gpConfirm" open={open}>
      <summary>Завершить программу</summary>
      <form action="/api/client/program" method="post">
        <input type="hidden" name="action" value="stop" />
        <span>Программа закроется, вернуть её будет нельзя. Ориентиры в профиле и дневник останутся как есть.</span>
        <button className="secondaryBtn compactBtn" type="submit">Да, завершить</button>
      </form>
    </details>
  );
}
