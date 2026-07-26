import Link from "next/link";
import { CalendarDays, ChevronRight, MessageCircle, Scale, Sparkles, Target, TrendingUp } from "lucide-react";
import { requireClient } from "@/lib/auth";
import { clientData, dayKey, fmt, mealSessions, pluralMeals, sumMeals } from "@/lib/data";
import FoodIcon from "@/components/FoodIcon";

export const dynamic = "force-dynamic";

function cleanTelegramMarkdown(text:string){
  return String(text||"")
    .replace(/\\([_*`])/g,"$1")
    .replace(/\*\*(.*?)\*\*/g,"$1")
    .replace(/\*(.*?)\*/g,"$1")
    .replace(/_(.*?)_/g,"$1")
    .replace(/`(.*?)`/g,"$1");
}
function pct(v:number,t:number){return t>0?Math.min(100,Math.round(v/t*100)):0}

export default async function Page(){
  const s=await requireClient();
  const d=await clientData(s.chatId!);
  const today=dayKey();
  const tm=d.meals.filter(m=>m.eaten_day===today);
  const sum=sumMeals(tm);
  const sessions=mealSessions(tm);

  const kcalTarget=Number(d.settings?.kcal_target||2000);
  const proteinTarget=Number(d.settings?.protein_target||d.settings?.protein_target_g||0);
  const fatTarget=Number(d.settings?.fat_target||d.settings?.fat_target_g||0);
  const carbTarget=Number(d.settings?.carb_target||d.settings?.carb_target_g||0);
  const currentWeight=Number(d.settings?.current_weight_kg||d.weights?.[0]?.weight_kg||0);
  const targetWeight=Number(d.settings?.target_weight_kg||0);
  const remaining=kcalTarget-sum.kcal;
  const lastDigest=d.digests?.[0];

  const recentDays=Array.from({length:7},(_,i)=>{
    const date=new Date();date.setDate(date.getDate()-(6-i));
    const day=dayKey(date);
    const rows=d.meals.filter(m=>m.eaten_day===day);
    return{day,total:sumMeals(rows),sessions:mealSessions(rows).length};
  });
  const activeDays=recentDays.filter(x=>x.sessions>0).length;
  const avg=activeDays?Math.round(recentDays.reduce((a,x)=>a+x.total.kcal,0)/activeDays):0;

  return <>
    <header className="clientWelcome">
      <div>
        <p>Сегодня, {new Date().toLocaleDateString("ru-RU",{day:"numeric",month:"long"})}</p>
        <h1>{d.profile?.first_name?`Привет, ${d.profile.first_name}`:"Твой рацион"}</h1>
        <span>{d.settings?.goal||"Отслеживай питание без лишней рутины"}</span>
      </div>
      <Link href="/client/profile" className="clientProfileChip">
        <i>{String(d.profile?.first_name||"К")[0]}</i>
        <span><b>{d.profile?.first_name||"Профиль"}</b><small>{d.subscription?.status==="active"?String(d.subscription.plan).toUpperCase():"Настроить"}</small></span>
      </Link>
    </header>

    <section className="clientDashboardHero">
      <div className="clientCalorieRing" style={{"--progress":`${pct(sum.kcal,kcalTarget)}%`} as React.CSSProperties}>
        <div><b>{fmt(sum.kcal)}</b><span>/ {fmt(kcalTarget)} ккал</span></div>
      </div>
      <div className="clientHeroCopy">
        <span>Дневная цель</span>
        <h2>{remaining>=0?`Осталось ${fmt(remaining)} ккал`:`Выше цели на ${fmt(Math.abs(remaining))} ккал`}</h2>
        <p>{sessions.length?`${sessions.length} ${pluralMeals(sessions.length)} сегодня`:"Первый приём ещё не добавлен"}</p>
        <div className="clientHeroActions">
          <Link className="primary compactBtn" href="/client/nutrition"><CalendarDays size={16}/>Питание</Link>
          <Link className="secondaryBtn" href="/client/progress"><TrendingUp size={16}/>Прогресс</Link>
        </div>
      </div>
      <div className="clientHeroMacro">
        <Macro title="Белки" value={sum.prot} target={proteinTarget}/>
        <Macro title="Жиры" value={sum.fat} target={fatTarget}/>
        <Macro title="Углеводы" value={sum.carb} target={carbTarget}/>
      </div>
    </section>

    <div className="clientQuickStats">
      <Quick icon={<Target/>} label="Дней с рационом" value={`${activeDays} / 7`} sub="за последнюю неделю"/>
      <Quick icon={<Sparkles/>} label="Среднее" value={avg?`${fmt(avg)} ккал`:"—"} sub="по дням с записями"/>
      <Quick icon={<Scale/>} label="Вес" value={currentWeight?`${fmt(currentWeight,1)} кг`:"—"} sub={targetWeight?`цель ${fmt(targetWeight,1)} кг`:"цель не указана"}/>
      <Quick icon={<MessageCircle/>} label="Поддержка" value="На связи" sub="ответит человек"/>
    </div>

    <div className="clientHomeGrid top">
      <section className="card clientRecentMeals">
        <div className="sectionTitleRow">
          <div><h2>{tm.length?"Сегодняшние приёмы":"Последние приёмы"}</h2><span className="muted">Сгруппированы по времени</span></div>
          <Link className="textLink" href="/client/nutrition">Вся история →</Link>
        </div>
        {(tm.length?sessions:mealSessions(d.meals).slice(0,4)).slice(0,4).map(session=><Link className="clientMealPreview" href={`/client/nutrition?day=${session.day}#day-${session.day}`} key={session.key}>
          <div className="mealPreviewIcons">{session.meals.slice(0,3).map(m=><i key={m.id}><FoodIcon dish={m.dish}/></i>)}</div>
          <div className="mealPreviewText">
            <b>{session.meals.length===1?session.meals[0].dish:`${session.meals.length} позиции`}</b>
            <small>{session.time} · {session.meals.slice(0,2).map(x=>x.dish).join(" · ")}{session.meals.length>2?"…":""}</small>
          </div>
          <strong>{fmt(session.total.kcal)} ккал</strong>
          <ChevronRight size={15}/>
        </Link>)}
        {!d.meals.length&&<div className="clientEmptyNice"><Sparkles/><b>Начни с ближайшего приёма</b><span>Отправь фото еды боту — запись появится здесь автоматически.</span></div>}
      </section>

      <section className="card clientInsightCard">
        <div className="sectionTitleRow"><div><h2>AI‑сводка</h2><span className="muted">Последний дневной отчёт</span></div><Sparkles size={19}/></div>
        {lastDigest?<div className="clientDigestPreview">
          <div className="digestDate">{new Date(lastDigest.for_date+"T12:00:00").toLocaleDateString("ru-RU",{day:"numeric",month:"long"})} · {fmt(lastDigest.kcal)} ккал</div>
          <p>{cleanTelegramMarkdown(lastDigest.summary_md)}</p>
          <Link className="textLink" href="/client/progress">Открыть прогресс →</Link>
        </div>:<div className="clientEmptyNice compact"><Sparkles/><b>Отчёт ещё формируется</b><span>Он появится после накопления данных о питании.</span></div>}
      </section>
    </div>

    <section className="card top clientWeekStrip">
      <div className="sectionTitleRow"><div><h2>Неделя</h2><span className="muted">Нажми на день, чтобы открыть питание</span></div></div>
      <div className="clientWeekCards">
        {recentDays.map(x=><Link href={`/client/nutrition?day=${x.day}#day-${x.day}`} className={x.day===today?"today":""} key={x.day}>
          <span>{new Date(x.day+"T12:00:00").toLocaleDateString("ru-RU",{weekday:"short"})}</span>
          <b>{new Date(x.day+"T12:00:00").getDate()}</b>
          <small>{x.sessions?`${x.sessions} ${pluralMeals(x.sessions)}`:"—"}</small>
          <i><em style={{width:`${pct(x.total.kcal,kcalTarget)}%`}}/></i>
        </Link>)}
      </div>
    </section>
  </>;
}

function Macro({title,value,target}:{title:string;value:number;target:number}){
  const p=pct(value,target);
  return <div className="heroMacroRow"><span>{title}</span><b>{fmt(value,1)} г</b><small>{target?`${p}%`:"—"}</small><i><em style={{width:`${p}%`}}/></i></div>
}
function Quick({icon,label,value,sub}:{icon:React.ReactNode;label:string;value:string;sub:string}){
  return <div className="clientQuickStat"><i>{icon}</i><span><small>{label}</small><b>{value}</b><em>{sub}</em></span></div>
}
