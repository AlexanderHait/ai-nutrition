import { CheckCircle2, Flame, Scale, Target, UserRound } from "lucide-react";
import {requireClient} from "@/lib/auth";
import {clientData,fmt,goalKind} from "@/lib/data";
export const dynamic="force-dynamic";

export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const s=await requireClient(),d=await clientData(s.chatId!),q=await searchParams;
  const current=Number(d.settings?.current_weight_kg||d.weights?.[0]?.weight_kg||0);
  const target=Number(d.settings?.target_weight_kg||0);
  const kcal=Number(d.settings?.kcal_target||2000);

  return <>
    <div className="pageHead"><div><p>Профиль</p><h1>Мои данные</h1><span>Эти параметры используются сайтом и AI‑нутрициологом.</span></div></div>
    {q.saved==="1"&&<div className="successNotice"><CheckCircle2 size={17}/>Сохранено. Новые параметры уже доступны боту.</div>}

    <section className="clientProfileHero">
      <div className="avatar huge">{String(d.profile?.first_name||"К")[0]}</div>
      <div><h2>{d.profile?.first_name||"Клиент"}</h2><p>{d.profile?.username?"@"+d.profile.username:`Telegram ${s.chatId}`}</p>
        <div className="clientTags"><span><Target size={13}/>{goalKind(d.settings?.goal)}</span><span><Flame size={13}/>{fmt(kcal)} ккал</span>{current>0&&<span><Scale size={13}/>{fmt(current,1)} кг</span>}</div>
      </div>
    </section>

    <div className="profileLayout top">
      <section className="card profileCardV2">
        <div className="sectionTitleRow"><div><h2>Параметры питания</h2><span className="muted">Изменения применяются после сохранения</span></div><UserRound size={19}/></div>
        <form action="/api/client/settings" method="post" className="form profileForm modern">
          <div className="formSection">
            <div className="formSectionTitle">Цель и основные данные</div>
            <label>Цель<select name="goal" defaultValue={d.settings?.goal||""}><option value="">Не выбрана</option><option value="Снижение веса">Снижение веса</option><option value="Поддержание">Поддержание</option><option value="Набор массы">Набор массы</option></select></label>
            <div className="grid2"><label>Пол<select name="sex" defaultValue={d.settings?.sex||""}><option value="">Не указан</option><option value="male">Мужской</option><option value="female">Женский</option></select></label><label>Дата рождения<input name="birth_date" type="date" defaultValue={d.settings?.birth_date||""}/></label></div>
            <div className="grid2"><label>Рост, см<input name="height_cm" type="number" min="100" max="250" step="0.1" defaultValue={d.settings?.height_cm||""}/></label><label>Целевые калории<input name="kcal_target" type="number" min="800" max="7000" defaultValue={d.settings?.kcal_target||2000}/></label></div>
          </div>

          <div className="formSection"><div className="formSectionTitle">Вес</div><div className="grid2"><label>Текущий вес, кг<input name="current_weight_kg" type="number" min="30" max="400" step="0.1" defaultValue={current||""}/></label><label>Целевой вес, кг<input name="target_weight_kg" type="number" min="30" max="400" step="0.1" defaultValue={target||""}/></label></div></div>

          <div className="formSection"><div className="formSectionTitle">Целевые БЖУ</div><div className="macroInputs">
            <label>Белки, г<input name="protein_target" type="number" min="0" max="500" step="0.1" defaultValue={d.settings?.protein_target||""}/></label>
            <label>Жиры, г<input name="fat_target" type="number" min="0" max="500" step="0.1" defaultValue={d.settings?.fat_target||""}/></label>
            <label>Углеводы, г<input name="carb_target" type="number" min="0" max="1000" step="0.1" defaultValue={d.settings?.carb_target||""}/></label>
          </div></div>
          <button className="primary saveProfileButton" type="submit">Сохранить изменения</button>
        </form>
      </section>

      <aside className="profileAside">
        <section className="card profileGoalCard"><h2>Цель</h2><div className="goalBig">{goalKind(d.settings?.goal)}</div>{current>0&&target>0?<><div className="goalWeightLine"><span>Сейчас</span><b>{fmt(current,1)} кг</b></div><div className="goalWeightLine"><span>Цель</span><b>{fmt(target,1)} кг</b></div><div className="weightTarget">Осталось: <b>{fmt(Math.abs(current-target),1)} кг</b></div></>:<p className="muted">Заполни текущий и целевой вес.</p>}</section>
        <section className="card"><div className="sectionTitleRow"><div><h2>Новое измерение</h2><span className="muted">Добавится в историю прогресса</span></div></div><form action="/api/client/weight" method="post" className="quickWeightForm vertical"><input name="weight_kg" type="number" min="30" max="400" step="0.1" placeholder="Например, 68.4" required/><button className="primary" type="submit">Записать вес</button></form></section>
      </aside>
    </div>
  </>;
}
