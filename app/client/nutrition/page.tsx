import Link from "next/link";
import { AlertTriangle, CalendarDays, CheckCircle2, ChevronDown, Sparkles } from "lucide-react";
import {requireClient} from "@/lib/auth";
import {clientData,dayKey,fmt,mealDay,mealSessions,pluralMeals,sumMeals} from "@/lib/data";
import {mealQuality,sessionQuality} from "@/lib/meal-quality";
import FoodIcon from "@/components/FoodIcon";

export const dynamic="force-dynamic";
type SearchParams=Promise<{day?:string}>;

function label(day:string){return new Date(day+"T12:00:00").toLocaleDateString("ru-RU",{day:"numeric",month:"long",weekday:"long"})}

export default async function Page({searchParams}:{searchParams:SearchParams}){
  const s=await requireClient();
  const d=await clientData(s.chatId!);
  const q=await searchParams;
  const selected=typeof q.day==="string"?q.day:"";
  const today=dayKey();

  const groups=new Map<string,typeof d.meals>();
  for(const m of d.meals){const dk=mealDay(m);if(!groups.has(dk))groups.set(dk,[]);groups.get(dk)!.push(m)}
  let entries=[...groups.entries()].sort(([a],[b])=>b.localeCompare(a));
  if(selected)entries.sort(([a],[b])=>a===selected?-1:b===selected?1:b.localeCompare(a));

  const calendar=Array.from({length:14},(_,i)=>{
    const dt=new Date();dt.setDate(dt.getDate()-(13-i));
    const day=dayKey(dt),rows=groups.get(day)||[];
    return{day,sessions:mealSessions(rows).length,kcal:sumMeals(rows).kcal};
  });

  return <>
    <div className="pageHead nutritionPageHead"><div><p>История</p><h1>Питание</h1><span>Дни, реальные приёмы и состав каждого из них.</span></div></div>

    <section className="card clientNutritionCalendar">
      <div className="sectionTitleRow"><div><h2>Последние 14 дней</h2><span className="muted">Быстрый переход к дню</span></div><CalendarDays size={19}/></div>
      <div className="nutritionCalendarStrip">
        {calendar.map(x=><Link href={`/client/nutrition?day=${x.day}#day-${x.day}`} className={`${x.day===selected?"active ":""}${x.sessions?"hasData ":""}${x.day===today?"today":""}`} key={x.day}>
          <span>{new Date(x.day+"T12:00:00").toLocaleDateString("ru-RU",{weekday:"short"})}</span>
          <b>{new Date(x.day+"T12:00:00").getDate()}</b>
          <small>{x.sessions?`${x.sessions} ${pluralMeals(x.sessions)}`:"—"}</small>
        </Link>)}
      </div>
    </section>

    <div className="nutritionDays modernNutrition top">
      {entries.slice(0,30).map(([day,rows])=>{
        const total=sumMeals(rows);
        const sessions=mealSessions(rows);
        const active=day===selected;
        return <section className={`nutritionDay ${active?"selectedDay":""}`} id={`day-${day}`} key={day}>
          <header className="nutritionDayHead modern">
            <div><h2>{label(day)}</h2><span>{sessions.length} {pluralMeals(sessions.length)} · {rows.length} позиций</span></div>
            <div className="nutritionDayTotal"><b>{fmt(total.kcal)} ккал</b><small>Б {fmt(total.prot,1)} · Ж {fmt(total.fat,1)} · У {fmt(total.carb,1)}</small></div>
          </header>

          <div className="visualMealHistory">
            {sessions.map((session,idx)=><details className="clientSessionCard" key={session.key} open={active&&idx===0}>
              <summary>
                <div className="sessionIconStack">{session.meals.slice(0,3).map(m=><i key={m.id}><FoodIcon dish={m.dish}/></i>)}</div>
                <div className="sessionTitle"><time>{session.time}</time><b>{session.meals.length===1?session.meals[0].dish:`${session.meals.length} позиции`}</b><small>{session.meals.slice(0,3).map(x=>x.dish).join(" · ")}{session.meals.length>3?"…":""}</small></div>
                <div className="sessionTotal"><b>{fmt(session.total.kcal)} ккал</b><small>Б {fmt(session.total.prot,1)} · Ж {fmt(session.total.fat,1)} · У {fmt(session.total.carb,1)}</small></div>
                {sessionQuality(session.meals).ok?<span className="mealQualityChip ok"><CheckCircle2 size={13}/>OK</span>:<span className="mealQualityChip check"><AlertTriangle size={13}/>Проверить</span>}
                <ChevronDown className="sessionChevron" size={17}/>
              </summary>
              <div className="sessionItems">
                {session.meals.map(m=><div className="sessionFoodRow" key={m.id}>
                  <i><FoodIcon dish={m.dish}/></i>
                  <span><b>{m.dish}</b><small>{fmt(m.grams)} г · Б {fmt(m.prot,1)} · Ж {fmt(m.fat,1)} · У {fmt(m.carb,1)}</small>{mealQuality(m).level!=="ok"&&<em className="mealIssue">{mealQuality(m).reasons[0]}</em>}</span>
                  <strong>{fmt(m.kcal)} ккал</strong>
                </div>)}
              </div>
            </details>)}
          </div>
        </section>
      })}
      {!entries.length&&<section className="card clientEmptyNice"><Sparkles/><b>Питание пока пустое</b><span>Отправь фото или продукт боту — история начнёт формироваться автоматически.</span></section>}
    </div>
  </>;
}
