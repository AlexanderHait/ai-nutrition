import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  CheckCircle2,
  ChevronRight,
  Settings2,
  Sparkles,
  Target,
  TrendingUp,
  UtensilsCrossed,
} from "lucide-react";
import { requireClient } from "@/lib/auth";
import {
  clientPremiumAccountData,
  premiumIntelligenceAccountData,
} from "@/lib/account-data";
import { subscriptionAccess } from "@/lib/subscription-access";
import { fmt } from "@/lib/data";

export const dynamic = "force-dynamic";

function clean(value: unknown) {
  return String(value || "")
    .replace(/\\([_*`])/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .trim();
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    saved?: string;
    feedback?: string;
    checkin?: string;
  }>;
}) {
  const current = await requireClient();
  const query = await searchParams;
  const access = await subscriptionAccess(current.accountId!);
  if (!access.premium) redirect("/client/plan");

  const [data, intelligence] = await Promise.all([
    clientPremiumAccountData(current.accountId!),
    premiumIntelligenceAccountData(current.accountId!),
  ]);

  const context: any = intelligence.context || {};
  const today = context.today || {};
  const eaten = today.eaten || {};
  const remaining = today.remaining || {};
  const settings = context.settings || {};
  const latest = intelligence.recommendations?.[0];
  const checkin = intelligence.checkins?.[0];

  const remainingKcal = Math.max(0, Number(remaining.kcal || 0));
  const remainingProtein = Math.max(0, Number(remaining.protein || 0));

  const dailyPlan = data.plan?.content_md
    ? clean(data.plan.content_md)
    : Number(settings.kcal_target || 0)
      ? `На остаток дня около ${fmt(remainingKcal)} ккал${
          Number(settings.protein_target || 0)
            ? ` и ${fmt(remainingProtein)} г белка`
            : ""
        }. Распредели их спокойно, без резких компенсаций.`
      : "Заполни дневную цель в профиле — после этого TeddY сразу соберёт конкретный план дня.";

  const weeklyFocus = data.report?.content_md
    ? clean(data.report.content_md)
    : "Сохраняй обычный ритм питания и фиксируй реальные приёмы пищи. Рекомендации станут точнее по мере накопления данных.";

  const nextStep =
    remainingProtein >= 25
      ? "Сделай белок основой следующего приёма"
      : Number(remaining.kcal || 0) < 0
        ? "Следующий приём сделай легче, без компенсации голоданием"
        : "Продолжай обычный режим без лишних корректировок";

  const hasSavedState = query.saved || query.feedback || query.checkin;

  return (
    <>
      <style>{`
        .coachPage{display:grid;gap:16px;min-width:0;max-width:100%}
        .coachPage *{min-width:0}
        .coachHero{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}
        .coachHeroCopy>p{margin:0 0 7px;color:var(--gold2);font-size:12px;font-weight:850;letter-spacing:.14em;text-transform:uppercase}
        .coachHeroCopy h1{margin:0;color:var(--text);font-size:clamp(30px,4vw,44px);line-height:1.02;letter-spacing:-1.2px}
        .coachHeroCopy>span{display:block;margin-top:8px;color:var(--muted);font-size:15px;line-height:1.5}
        .coachHeroActions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
        .coachHeroActions a{display:inline-flex;align-items:center;gap:7px;min-height:42px;padding:0 14px;border:1px solid var(--line2);border-radius:12px;background:var(--surface);color:var(--text);font-size:13px;font-weight:750}
        .coachHeroActions a.primaryAction{border-color:transparent;background:linear-gradient(135deg,#e2c56b,#cda648);color:#17201e}
        .coachStatusGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
        .coachStatus{padding:16px;border:1px solid var(--line);border-radius:16px;background:var(--surface);box-shadow:var(--shadow)}
        .coachStatus small{display:block;color:var(--gold2);font-size:11px;font-weight:850;letter-spacing:.12em;text-transform:uppercase}
        .coachStatus b{display:block;margin-top:7px;color:var(--text);font-size:15px;line-height:1.35}
        .coachStatus span{display:block;margin-top:4px;color:var(--muted);font-size:13px;line-height:1.4}
        .coachDecisionV2{display:grid;grid-template-columns:46px minmax(0,1fr) auto;gap:14px;align-items:center;padding:18px;border:1px solid color-mix(in srgb,var(--gold) 36%,var(--line));border-radius:18px;background:linear-gradient(135deg,var(--surface),var(--accent-soft));box-shadow:var(--shadow)}
        .coachDecisionV2>i{width:46px;height:46px;display:grid;place-items:center;border-radius:14px;background:var(--accent-soft);color:var(--gold2)}
        .coachDecisionV2 small{display:block;color:var(--gold2);font-size:11px;font-weight:850;letter-spacing:.12em;text-transform:uppercase}
        .coachDecisionV2 h2{margin:5px 0 3px;color:var(--text);font-size:21px;line-height:1.28}
        .coachDecisionV2 p{margin:0;color:var(--muted);font-size:14px;line-height:1.45}
        .coachDecisionV2>a{display:inline-flex;align-items:center;gap:5px;color:var(--gold2);font-size:13px;font-weight:800;white-space:nowrap}
        .coachColumns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
        .coachPanel{padding:20px;border:1px solid var(--line);border-radius:18px;background:var(--surface);box-shadow:var(--shadow)}
        .coachPanelHead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}
        .coachPanelHead h2{margin:0;color:var(--text);font-size:18px}
        .coachPanelHead span{display:block;margin-top:4px;color:var(--muted);font-size:13px;line-height:1.4}
        .coachPanelHead>svg{color:var(--gold2);opacity:.85}
        .coachReadable{color:var(--text);font-size:14px;line-height:1.7;white-space:pre-wrap;overflow-wrap:anywhere}
        .coachFeedback{display:grid;grid-template-columns:auto minmax(180px,1fr) auto;gap:8px;margin-top:14px}
        .coachFeedback button,.coachFeedback select{min-height:42px}
        .coachCheckin{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
        .coachCheckin label{display:grid;gap:6px;color:var(--muted);font-size:13px}
        .coachCheckin textarea,.coachCheckin button{grid-column:1/-1}
        .coachCheckin textarea{min-height:96px}
        .coachQuickActions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
        .coachQuickActions a{display:grid;grid-template-columns:40px minmax(0,1fr) 18px;gap:11px;align-items:center;padding:15px;border:1px solid var(--line);border-radius:15px;background:var(--surface);box-shadow:var(--shadow)}
        .coachQuickActions i{width:40px;height:40px;display:grid;place-items:center;border-radius:12px;background:var(--surface-soft);color:var(--gold2)}
        .coachQuickActions span{display:grid;gap:3px}.coachQuickActions b{color:var(--text);font-size:14px}.coachQuickActions small{color:var(--muted);font-size:12px;line-height:1.35}.coachQuickActions>svg{color:var(--muted)}
        @media(max-width:900px){
          .coachPage{gap:13px}
          .coachHero{display:grid}
          .coachHeroActions{justify-content:flex-start}
          .coachStatusGrid{grid-template-columns:repeat(2,minmax(0,1fr))}
          .coachColumns{grid-template-columns:1fr}
          .coachQuickActions{grid-template-columns:1fr}
        }
        @media(max-width:560px){
          .coachHeroCopy h1{font-size:31px}
          .coachHeroActions{display:grid;grid-template-columns:1fr 1fr;width:100%}
          .coachHeroActions a{justify-content:center;padding:0 10px}
          .coachStatusGrid{grid-template-columns:1fr 1fr;gap:8px}
          .coachStatus{padding:13px}
          .coachStatus b{font-size:14px}
          .coachDecisionV2{grid-template-columns:42px minmax(0,1fr);padding:16px;align-items:start}
          .coachDecisionV2>i{width:42px;height:42px}
          .coachDecisionV2>a{grid-column:2;justify-self:start;margin-top:3px}
          .coachPanel{padding:17px}
          .coachFeedback{grid-template-columns:1fr}
          .coachCheckin{grid-template-columns:1fr}
          .coachCheckin textarea,.coachCheckin button{grid-column:1}
        }
      `}</style>

      <div className="coachPage">
        <header className="coachHero">
          <div className="coachHeroCopy">
            <p>Premium Coach</p>
            <h1>Твой нутрициолог</h1>
            <span>Конкретные решения на сегодня и понятный фокус на неделю.</span>
          </div>
          <div className="coachHeroActions">
            <Link href="/client/profile">
              <Settings2 size={17} /> Настройки
            </Link>
            <Link className="primaryAction" href="/client/nutrition">
              <UtensilsCrossed size={17} /> Питание
            </Link>
          </div>
        </header>

        {hasSavedState ? (
          <div className="successNotice">
            <CheckCircle2 size={16} /> Сохранено. TeddY учтёт это в следующих рекомендациях.
          </div>
        ) : null}

        <section className="coachStatusGrid" aria-label="Сводка Coach">
          <article className="coachStatus">
            <small>Сегодня</small>
            <b>{fmt(Number(eaten.kcal || 0))} ккал съедено</b>
            <span>{fmt(remainingKcal)} ккал осталось</span>
          </article>
          <article className="coachStatus">
            <small>Белок</small>
            <b>{fmt(Number(eaten.protein || 0))} г съедено</b>
            <span>{fmt(remainingProtein)} г осталось</span>
          </article>
          <article className="coachStatus">
            <small>Вес</small>
            <b>{intelligence.weights?.length || 0} измерений</b>
            <span>Чем регулярнее, тем точнее прогноз</span>
          </article>
          <article className="coachStatus">
            <small>Данные</small>
            <b>{intelligence.context ? "Контекст обновлён" : "Нужны записи"}</b>
            <span>TeddY использует питание, вес и обратную связь</span>
          </article>
        </section>

        <section className="coachDecisionV2">
          <i><Sparkles size={22} /></i>
          <div>
            <small>Следующее действие</small>
            <h2>{nextStep}</h2>
            <p>Ориентир на остаток дня: {fmt(remainingKcal)} ккал и {fmt(remainingProtein)} г белка.</p>
          </div>
          <Link href="/client/nutrition">Открыть рацион <ChevronRight size={15} /></Link>
        </section>

        <div className="coachColumns">
          <section className="coachPanel">
            <div className="coachPanelHead">
              <div><h2>План на сегодня</h2><span>Без лишних расчётов и резких ограничений</span></div>
              <Sparkles size={19} />
            </div>
            <div className="coachReadable">{dailyPlan}</div>
          </section>

          <section className="coachPanel">
            <div className="coachPanelHead">
              <div><h2>Фокус недели</h2><span>Одна главная задача, которая двигает к цели</span></div>
              <Target size={19} />
            </div>
            <div className="coachReadable">{weeklyFocus}</div>
          </section>
        </div>

        {latest ? (
          <section className="coachPanel">
            <div className="coachPanelHead">
              <div><h2>Последняя рекомендация</h2><span>Отметь, насколько она подходит именно тебе</span></div>
              <TrendingUp size={19} />
            </div>
            <div className="coachReadable">{clean(latest.recommendation_text)}</div>
            {!latest.feedback ? (
              <form action="/api/premium/feedback" method="post" className="coachFeedback">
                <input type="hidden" name="id" value={latest.id} />
                <button name="feedback" value="useful" className="secondaryBtn">Полезно</button>
                <select name="reason" defaultValue="">
                  <option value="">Причина — необязательно</option>
                  <option>Не люблю эти продукты</option>
                  <option>Слишком дорого</option>
                  <option>Нет времени готовить</option>
                  <option>Слишком большой объём</option>
                  <option>Другое</option>
                </select>
                <button name="feedback" value="not_fit" className="secondaryBtn">Не подходит</button>
              </form>
            ) : null}
          </section>
        ) : null}

        <section className="coachPanel">
          <div className="coachPanelHead">
            <div><h2>Как ты себя чувствуешь</h2><span>Это помогает корректировать рекомендации без догадок</span></div>
            <Activity size={19} />
          </div>
          <form className="coachCheckin" action="/api/premium/checkin" method="post">
            <label>Голод
              <select name="hunger" defaultValue={checkin?.hunger || "normal"}>
                <option value="low">Низкий</option><option value="normal">Нормальный</option><option value="high">Высокий</option>
              </select>
            </label>
            <label>Энергия
              <select name="energy" defaultValue={checkin?.energy || "normal"}>
                <option value="low">Низкая</option><option value="normal">Нормальная</option><option value="high">Высокая</option>
              </select>
            </label>
            <label>Соблюдать питание
              <select name="adherence_ease" defaultValue={checkin?.adherence_ease || "normal"}>
                <option value="easy">Легко</option><option value="normal">Нормально</option><option value="hard">Сложно</option>
              </select>
            </label>
            <textarea name="note" placeholder="Комментарий — необязательно" defaultValue={checkin?.note || ""} />
            <button className="primary">Сохранить самочувствие</button>
          </form>
        </section>

        <nav className="coachQuickActions" aria-label="Быстрые действия Coach">
          <Link href="/client/nutrition">
            <i><UtensilsCrossed size={19} /></i>
            <span><b>Что поесть сейчас</b><small>Рацион, остаток калорий и КБЖУ</small></span>
            <ChevronRight size={16} />
          </Link>
          <Link href="/client/progress">
            <i><TrendingUp size={19} /></i>
            <span><b>Почему меняется вес</b><small>Сравнить питание и динамику</small></span>
            <ChevronRight size={16} />
          </Link>
          <Link href="/client/profile">
            <i><Settings2 size={19} /></i>
            <span><b>Изменить цель</b><small>Вес, калории и КБЖУ</small></span>
            <ChevronRight size={16} />
          </Link>
        </nav>
      </div>
    </>
  );
}
