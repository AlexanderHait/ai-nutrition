import { CheckCircle2, Gauge, Sparkles, Target, UserRound } from "lucide-react";
import { requireClient } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const current = await requireClient();
  const query = await searchParams;
  const db = getSupabaseAdmin();
  const { data: settings } = await db
    .from("client_settings")
    .select("goal,sex,age_years,height_cm,current_weight_kg,target_weight_kg,activity_level")
    .eq("account_id", current.accountId!)
    .maybeSingle();

  return (
    <>
      <style>{`
        .setupShell{max-width:860px;margin:0 auto;padding-bottom:30px}
        .setupIntro{max-width:650px;margin-bottom:20px}
        .setupIntro p{margin:0 0 7px;color:var(--gold);font-size:10px;text-transform:uppercase;letter-spacing:.12em;font-weight:800}
        .setupIntro h1{margin:0;font-size:clamp(30px,5vw,48px);letter-spacing:-1.5px;line-height:1.02}
        .setupIntro span{display:block;margin-top:10px;color:var(--muted);max-width:600px}
        .setupProgress{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:20px 0}
        .setupProgress div{padding:12px;border:1px solid var(--line);border-radius:13px;background:#101114;display:flex;gap:10px;align-items:center}
        .setupProgress i{width:29px;height:29px;border-radius:9px;display:grid;place-items:center;background:#18170f;color:var(--gold);font-style:normal;font-weight:900}
        .setupProgress b{display:block;font-size:12px}.setupProgress small{display:block;color:var(--muted);font-size:10px;margin-top:2px}
        .setupForm{display:grid;gap:12px}
        .setupStep{padding:19px;border:1px solid var(--line);border-radius:16px;background:#101114}
        .setupStepHead{display:flex;gap:12px;align-items:flex-start;margin-bottom:16px}
        .setupStepHead i{width:37px;height:37px;border-radius:11px;display:grid;place-items:center;background:#18170f;color:var(--gold)}
        .setupStepHead h2{margin:0;font-size:17px}.setupStepHead p{margin:4px 0 0;color:var(--muted);font-size:12px}
        .setupGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}
        .setupForm label{display:grid;gap:7px;color:#bbbdb9;font-size:12px}
        .setupGoal{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
        .setupGoal label{position:relative}.setupGoal input{position:absolute;opacity:0;pointer-events:none}
        .setupGoal span{display:block;padding:14px 12px;border:1px solid var(--line2);border-radius:12px;background:#0d0e11;text-align:center;font-weight:750;cursor:pointer}
        .setupGoal input:checked+span{border-color:#88743d;background:#17150f;color:#efd47c}
        .setupResult{display:grid;grid-template-columns:auto 1fr;gap:13px;align-items:center;padding:15px;border:1px solid #323024;border-radius:13px;background:#14130f}
        .setupResult i{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:#1d1a10;color:var(--gold)}
        .setupResult b{display:block}.setupResult span{display:block;color:#a6a79f;font-size:12px;margin-top:3px}
        .setupSubmit{display:flex;justify-content:flex-end;margin-top:3px}.setupSubmit button{min-width:240px}
        @media(max-width:650px){.setupProgress,.setupGoal,.setupGrid{grid-template-columns:1fr}.setupProgress{gap:6px}.setupSubmit button{width:100%}}
      `}</style>

      <div className="setupShell">
        <div className="setupIntro">
          <p>Первый запуск · около 2 минут</p>
          <h1>Настроим TeddY под твою цель</h1>
          <span>После сохранения сразу появятся персональные калории, БЖУ и первый понятный шаг — без пустого кабинета.</span>
        </div>

        {query.error ? <div className="errorNotice">Проверь заполненные данные. Ничего не было сохранено.</div> : null}

        <div className="setupProgress">
          <div><i>1</i><span><b>Цель</b><small>Куда движемся</small></span></div>
          <div><i>2</i><span><b>Параметры</b><small>Для точного расчёта</small></span></div>
          <div><i>3</i><span><b>Первый план</b><small>Сразу после сохранения</small></span></div>
        </div>

        <form className="setupForm" action="/api/client/setup" method="post">
          <section className="setupStep">
            <div className="setupStepHead"><i><Target size={19} /></i><div><h2>1. Выбери цель</h2><p>Это влияет на калорийность и рекомендации.</p></div></div>
            <div className="setupGoal">
              {[
                ["Снижение веса", "Снижение веса"],
                ["Поддержание", "Поддержание"],
                ["Набор массы", "Набор массы"],
              ].map(([value, label]) => (
                <label key={value}>
                  <input type="radio" name="goal" value={value} defaultChecked={(settings?.goal || "") === value || (!settings?.goal && value === "Поддержание")} required />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="setupStep">
            <div className="setupStepHead"><i><UserRound size={19} /></i><div><h2>2. Основные параметры</h2><p>Только данные, которые действительно нужны для расчёта.</p></div></div>
            <div className="setupGrid">
              <label>Пол
                <select name="sex" defaultValue={settings?.sex || "male"} required>
                  <option value="male">Мужской</option>
                  <option value="female">Женский</option>
                </select>
              </label>
              <label>Возраст
                <input name="age_years" type="number" min="14" max="100" defaultValue={settings?.age_years || ""} placeholder="Например, 30" required />
              </label>
              <label>Рост, см
                <input name="height_cm" type="number" min="120" max="230" step="0.1" defaultValue={settings?.height_cm || ""} placeholder="Например, 175" required />
              </label>
              <label>Текущий вес, кг
                <input name="current_weight_kg" type="number" min="35" max="300" step="0.1" defaultValue={settings?.current_weight_kg || ""} placeholder="Например, 68.5" required />
              </label>
              <label>Целевой вес, кг
                <input name="target_weight_kg" type="number" min="35" max="300" step="0.1" defaultValue={settings?.target_weight_kg || ""} placeholder="Например, 75" required />
              </label>
              <label>Повседневная активность
                <select name="activity_level" defaultValue={settings?.activity_level || "moderate"} required>
                  <option value="low">Низкая</option>
                  <option value="light">Лёгкая</option>
                  <option value="moderate">Средняя</option>
                  <option value="high">Высокая</option>
                  <option value="very_high">Очень высокая</option>
                </select>
              </label>
            </div>
          </section>

          <section className="setupStep">
            <div className="setupStepHead"><i><Gauge size={19} /></i><div><h2>3. Получи первый ориентир</h2><p>TeddY рассчитает персональные калории и БЖУ автоматически.</p></div></div>
            <div className="setupResult">
              <i><Sparkles size={20} /></i>
              <div><b>После сохранения откроется экран «Сегодня»</b><span>Там сразу будут твои цели, остаток на день и одно понятное действие: добавить первый приём пищи.</span></div>
            </div>
          </section>

          <div className="setupSubmit">
            <button className="primary" type="submit"><CheckCircle2 size={17} /> Рассчитать мой план</button>
          </div>
        </form>
      </div>
    </>
  );
}
