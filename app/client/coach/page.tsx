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
  searchParams: Promise<{ saved?: string; feedback?: string; checkin?: string }>;
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
  const weightCount = Number(context.weight_trend?.count || context.data_quality?.weight_count || 0);

  const dailyPlan = data.plan?.content_md
    ? clean(data.plan.content_md)
    : Number(settings.kcal_target || 0)
      ? `На остаток дня около ${fmt(remainingKcal)} ккал${Number(settings.protein_target || 0) ? ` и ${fmt(remainingProtein)} г белка` : ""}. Распредели их спокойно, без резких компенсаций.`
      : "Заполни дневную цель в профиле — после этого TeddY сразу соберёт конкретный план дня.";

  const weeklyFocus = data.report?.content_md
    ? clean(data.report.content_md)
    : "Сохраняй обычный ритм питания и фиксируй реальные приёмы пищи. Рекомендации станут точнее по мере накопления данных.";

  const nextStep = remainingProtein >= 25
    ? "Сделай белок основой следующего приёма"
    : Number(remaining.kcal || 0) < 0
      ? "Следующий приём сделай легче, без компенсации голоданием"
      : "Продолжай обычный режим без лишних корректировок";

  return (
    <div className="coachPageV2">
      <style>{`
        .coachPageV2{display:grid;gap:14px;min-width:0;max-width:100%;overflow:hidden}
        .coachPageV2 *{min-width:0}
        .coachHeadV2{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}
        .coachHeadV2 p{margin:0 0 6px;color:var(--gold2);font-size:12px;font-weight:850;letter-spacing:.14em;text-transform:uppercase}
        .coachHeadV2 h1{margin:0;color:var(--text);font-size:clamp(30px,4vw,42px);line-height:1.02;letter-spacing:-1px}
        .coachHeadV2 span{display:block;margin-top:7px;color:var(--muted);font-size:14px;line-height:1.5}
        .coachHeadActions{display:flex;gap:8px;flex-wrap:wrap}
        .coachHeadActions a{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:42px;padding:0 14px;border:1px solid var(--line2);border-radius:12px;background:var(--surface);color:var(--text);font-size:13px;font-weight:800}
        .coachHeadActions a:last-child{border:0;background:linear-gradient(135deg,#e2c56b,#cda648);color:#17201e}
        .coachStatsV2{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}
        .coachStatV2,.coachPanelV2,.coachActionV2,.coachQuickV2 a{border:1px solid var(--line);background:var(--surface);box-shadow:var(--shadow)}
        .coachStatV2{padding:14px;border-radius:15px}
        .coachStatV2 small{display:block;color:var(--gold2);font-size:11px;font-weight:850;letter-spacing:.1em;text-transform:uppercase}
        .coachStatV2 b{display:block;margin-top:6px;color:var(--text);font-size:14px;line-height:1.35}
        .coachStatV2 span{display:block;margin-top:3px;color:var(--muted);font-size:12px;line-height:1.4}
        .coachActionV2{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:13px;align-items:center;padding:17px;border-radius:17px;background:linear-gradient(135deg,var(--surface),var(--accent-soft))}
        .coachActionV2 i,.coachQuickV2 i{display:grid;place-items:center;background:var(--accent-soft);color:var(--gold2)}
        .coachActionV2 i{width:44px;height:44px;border-radius:13px}
        .coachActionV2 small{display:block;color:var(--gold2);font-size:11px;font-weight:850;letter-spacing:.1em;text-transform:uppercase}
        .coachActionV2 h2{margin:4px 0 3px;color:var(--text);font-size:19px;line-height:1.3}
        .coachActionV2 p{margin:0;color:var(--muted);font-size:13px;line-height:1.45}
        .coachActionV2>a{display:inline-flex;align-items:center;gap:4px;color:var(--gold2);font-size:13px;font-weight:800;white-space:nowrap}
        .coachGridV2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
        .coachPanelV2{padding:18px;border-radius:17px}
        .coachPanelTitle{display:flex;justify-content:space-between;gap:10px;margin-bottom:12px}
        .coachPanelTitle h2{margin:0;color:var(--text);font-size:17px}.coachPanelTitle span{display:block;margin-top:4px;color:var(--muted);font-size:12px;line-height:1.4}.coachPanelTitle>svg{color:var(--gold2)}
        .coachBodyV2{color:var(--text);font-size:14px;line-height:1.68;white-space:pre-wrap;overflow-wrap:anywhere}
        .coachFeedbackV2{display:grid;grid-template-columns:auto minmax(180px,1fr) auto;gap:8px;margin-top:13px}
        .coachCheckinV2{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
        .coachCheckinV2 label{display:grid;gap:6px;color:var(--muted);font-size:12px}.coachCheckinV2 textarea,.coachCheckinV2 button{grid-column:1/-1}.coachCheckinV2 textarea{min-height:90px}
        .coachQuickV2{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
        .coachQuickV2 a{display:grid;grid-template-columns:38px minmax(0,1fr) 16px;gap:10px;align-items:center;padding:14px;border-radius:14px}
        .coachQuickV2 i{width:38px;height:38px;border-radius:11px}.coachQuickV2 span{display:grid;gap:2px}.coachQuickV2 b{color:var(--text);font-size:13px}.coachQuickV2 small{color:var(--muted);font-size:12px;line-height:1.35}.coachQuickV2>a>svg{color:var(--muted)}
        @media(max-width:900px){.coachHeadV2{display:grid}.coachStatsV2{grid-template-columns:1fr 1fr}.coachGridV2,.coachQuickV2{grid-template-columns:1fr}}
        @media(max-width:560px){
          .coachHeadV2 h1{font-size:30px}.coachHeadActions{display:grid;grid-template-columns:1fr 1fr;width:100%}.coachHeadActions a{padding:0 9px}
          .coachStatsV2{gap:7px}.coachStatV2{padding:12px}.coachStatV2 b{font-size:13px}
          .coachActionV2{grid-template-columns:42px minmax(0,1fr);padding:15px}.coachActionV2>a{grid-column:2;justify-self:start}.coachPanelV2{padding:16px}
          .coachFeedbackV2,.coachCheckinV2{grid-template-columns:1fr}.coachCheckinV2 textarea,.coachCheckinV2 button{grid-column:1}
        }
      `}</style>

      <header className="coachHeadV2">
        <div>
          <p>Premium Coach</p>
          <h1>Твой нутрициолог</h1>
          <span>Конкретные решения на сегодня и понятный фокус на неделю.</span>
        </div>
        <div className="coachHeadActions">
          <Link href="/client/profile"><Settings2 size={17} /> Настройки</Link>
          <Link href="/client/nutrition"><UtensilsCrossed size={17} /> Питание</Link>
        </div>
      </header>

      {(query.saved || query.feedback || query.checkin) ? (
        <div className="successNotice"><CheckCircle2 size={16} /> Сохранено. TeddY учтёт это в следующих рекомендациях.</div>
      ) : null}

      <section className="coachStatsV2">
        <article className="coachStatV2"><small>Сегодня</small><b>{fmt(Number(eaten.kcal || 0))} ккал съедено</b><span>{fmt(remainingKcal)} ккал осталось</span></article>
        <article className="coachStatV2"><small>Белок</small><b>{fmt(Number(eaten.protein || 0))} г съедено</b><span>{fmt(remainingProtein)} г осталось</span></article>
        <article className="coachStatV2"><small>Вес</small><b>{weightCount || "Мало"} измерений</b><span>Регулярность улучшает прогноз</span></article>
        <article className="coachStatV2"><small>Данные</small><b>{intelligence.context ? "Контекст обновлён" : "Нужны записи"}</b><span>Питание, вес и обратная связь</span></article>
      </section>

      <section className="coachActionV2">
        <i><Sparkles size={21} /></i>
        <div><small>Следующее действие</small><h2>{nextStep}</h2><p>Ориентир: {fmt(remainingKcal)} ккал и {fmt(remainingProtein)} г белка.</p></div>
        <Link href="/client/nutrition">Открыть рацион <ChevronRight size={14} /></Link>
      </section>

      <div className="coachGridV2">
        <section className="coachPanelV2"><div className="coachPanelTitle"><div><h2>План на сегодня</h2><span>Без резких ограничений</span></div><Sparkles size={18} /></div><div className="coachBodyV2">{dailyPlan}</div></section>
        <section className="coachPanelV2"><div className="coachPanelTitle"><div><h2>Фокус недели</h2><span>Одна главная задача</span></div><Target size={18} /></div><div className="coachBodyV2">{weeklyFocus}</div></section>
      </div>

      {latest ? (
        <section className="coachPanelV2">
          <div className="coachPanelTitle"><div><h2>Последняя рекомендация</h2><span>Отметь, насколько она подходит</span></div><TrendingUp size={18} /></div>
          <div className="coachBodyV2">{clean(latest.recommendation_text)}</div>
          {!latest.feedback ? (
            <form action="/api/premium/feedback" method="post" className="coachFeedbackV2">
              <input type="hidden" name="id" value={latest.id} />
              <button name="feedback" value="useful" className="secondaryBtn">Полезно</button>
              <select name="reason" defaultValue=""><option value="">Причина — необязательно</option><option>Не люблю эти продукты</option><option>Слишком дорого</option><option>Нет времени готовить</option><option>Слишком большой объём</option><option>Другое</option></select>
              <button name="feedback" value="not_fit" className="secondaryBtn">Не подходит</button>
            </form>
          ) : null}
        </section>
      ) : null}

      <section className="coachPanelV2">
        <div className="coachPanelTitle"><div><h2>Как ты себя чувствуешь</h2><span>Помогает точнее корректировать план</span></div><Activity size={18} /></div>
        <form className="coachCheckinV2" action="/api/premium/checkin" method="post">
          <label>Голод<select name="hunger" defaultValue={checkin?.hunger || "normal"}><option value="low">Низкий</option><option value="normal">Нормальный</option><option value="high">Высокий</option></select></label>
          <label>Энергия<select name="energy" defaultValue={checkin?.energy || "normal"}><option value="low">Низкая</option><option value="normal">Нормальная</option><option value="high">Высокая</option></select></label>
          <label>Соблюдать питание<select name="adherence_ease" defaultValue={checkin?.adherence_ease || "normal"}><option value="easy">Легко</option><option value="normal">Нормально</option><option value="hard">Сложно</option></select></label>
          <textarea name="note" placeholder="Комментарий — необязательно" defaultValue={checkin?.note || ""} />
          <button className="primary">Сохранить самочувствие</button>
        </form>
      </section>

      <nav className="coachQuickV2">
        <Link href="/client/nutrition"><i><UtensilsCrossed size={18} /></i><span><b>Что поесть сейчас</b><small>Рацион и остаток КБЖУ</small></span><ChevronRight size={15} /></Link>
        <Link href="/client/progress"><i><TrendingUp size={18} /></i><span><b>Почему меняется вес</b><small>Питание и динамика</small></span><ChevronRight size={15} /></Link>
        <Link href="/client/profile"><i><Settings2 size={18} /></i><span><b>Изменить цель</b><small>Вес, калории и КБЖУ</small></span><ChevronRight size={15} /></Link>
      </nav>
    </div>
  );
}
