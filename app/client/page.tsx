import TelegramAvatar from "@/components/TelegramAvatar";
import Link from "next/link";
import { AlertTriangle, CalendarDays, CheckCircle2, ChevronRight, Clock3, Crown, MessageCircle, Scale, Sparkles, Target, TrendingUp, UtensilsCrossed } from "lucide-react";
import { requireClient } from "@/lib/auth";
import { clientHomeAccountData } from "@/lib/account-data";
import { dayKey, fmt, mealDay, mealSessions, pluralMeals, sumMeals } from "@/lib/data";
import { sessionQuality } from "@/lib/meal-quality";
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
  const d=await clientHomeAccountData(s.accountId!);
  const today=dayKey();
  const tm=d.meals.filter(m=>mealDay(m)===today);
  const sum=sumMeals(tm);
  const sessions=mealSessions(tm);

  const kcalTarget=Number(d.settings?.kcal_target||2000);
  const proteinTarget=Number(d.settings?.protein_target||d.settings?.protein_target_g||0);
  const fatTarget=Number(d.settings?.fat_target||d.settings?.fat_target_g||0);
  const carbTarget=Number(d.settings?.carb_target||d.settings?.carb_target_g||0);
  const currentWeight=Number(d.settings?.current_weight_kg||d.weights?.[0]?.weight_kg||0);
  const targetWeight=Number(d.settings?.target_weight_kg||0);
  const premium=d.subscription?.status==="active"&&d.subscription?.plan==="premium"&&(!d.subscription?.ends_at||new Date(d.subscription.ends_at)>new Date());
  const remaining=kcalTarget-sum.kcal;
  const lastDigest=d.digests?.[0];
  const latestMeal=d.meals?.[0];
  const dataFresh=latestMeal?new Date(latestMeal.eaten_at).toLocaleString("ru-RU",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit",timeZone:"Europe/Moscow"}):"пока нет записей";

  const recentDays=Array.from({length:7},(_,i)=>{
    const date=new Date();date.setDate(date.getDate()-(6-i));
    const day=dayKey(date);
    const rows=d.meals.filter(m=>mealDay(m)===day);
    return{day,total:sumMeals(rows),sessions:mealSessions(rows).length};
  });
  const activeDays=recentDays.filter(x=>x.sessions>0).length;
  const avg=activeDays?Math.round(recentDays.reduce((a,x)=>a+x.total.kcal,0)/activeDays):0;

  const todayQuality=sessions.reduce((a,s)=>{
    const q=sessionQuality(s.meals); return {bad:a.bad+q.bad,check:a.check+q.check};
  },{bad:0,check:0});
  const proteinRemaining=Math.max(0,proteinTarget-sum.prot);
  const fatRemaining=Math.max(0,fatTarget-sum.fat);
  const carbRemaining=Math.max(0,carbTarget-sum.carb);
  const hour=Number(new Intl.DateTimeFormat("ru-RU",{timeZone:"Europe/Moscow",hour:"2-digit",hour12:false}).format(new Date()));
  const likelyMealsLeft=hour<13?3:hour<17?2:hour<21?1:1;
  const nextMealKcal=Math.max(0,Math.round(Math.max(remaining,0)/likelyMealsLeft/50)*50);
  const nextMealProtein=proteinTarget>0?Math.max(0,Math.round(proteinRemaining/likelyMealsLeft/5)*5):0;
  const nextMealText=remaining<=0
    ?"По калориям дневная цель уже закрыта. Следующий приём лучше сделать лёгким и ориентироваться на голод."
    :`Ориентир на следующий приём: ~${fmt(nextMealKcal)} ккал${nextMealProtein?` и ${fmt(nextMealProtein)} г белка`:""}.`;

  const attention=
    todayQuality.bad>0
      ? {tone:"warn",icon:<AlertTriangle size={18}/>,title:"Есть данные, которые стоит проверить",text:`${todayQuality.bad} поз. с подозрительной массой или КБЖУ. Открой питание и сверь их.`}
      : proteinTarget>0&&proteinRemaining>=25
        ? {tone:"focus",icon:<Target size={18}/>,title:`Осталось ~${fmt(proteinRemaining)} г белка`,text:"Следующий приём лучше собрать вокруг белкового продукта."}
        : sessions.length===0
          ? {tone:"neutral",icon:<Sparkles size={18}/>,title:"Рацион на сегодня ещё пуст",text:"Отправь фото или внеси еду через бота — данные сразу появятся здесь."}
          : {tone:"good",icon:<CheckCircle2 size={18}/>,title:"День выглядит аккуратно",text:"Сохранённые позиции проходят базовую проверку. Продолжай фиксировать рацион."};

  return <>
    <header className="clientWelcome">
      <div>
        <p>Сегодня, {new Date().toLocaleDateString("ru-RU",{day:"numeric",month:"long"})}</p>
        <h1>{d.profile?.first_name?`Привет, ${d.profile.first_name}`:"Твой рацион"}</h1>
        <span>{d.settings?.goal||"Отслеживай питание без лишней рутины"}</span>
      </div>
      <div className="clientWelcomeActions"><span className="freshDataChip"><Clock3 size={13}/>Данные: {dataFresh}</span><Link href="/client/profile" className="clientProfileChip">
        <TelegramAvatar profile={d.profile} size="small"/>
        <span><b>{d.profile?.first_name||"Профиль"}</b><small>{d.subscription?.status==="active"?String(d.subscription.plan).toUpperCase():"Настроить"}</small></span>
      </Link></div>
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

    <section className={`clientAttention ${attention.tone}`}>
      <i>{attention.icon}</i>
      <div><span>Сейчас важно</span><b>{attention.title}</b><p>{attention.text}</p></div>
      <Link href="/client/nutrition">Открыть <ChevronRight size={15}/></Link>
    </section>

    <section className="smartMealCard">
      <div className="smartMealIcon"><UtensilsCrossed size={20}/></div>
      <div className="smartMealBody">
        <span>Следующий приём</span>
        <h3>{nextMealText}</h3>
        <div className="smartMealMacros">
          <b>{remaining>0?`${fmt(Math.max(remaining,0))} ккал осталось`:"Калории закрыты"}</b>
          {proteinTarget>0&&<small>Белок: ещё {fmt(proteinRemaining)} г</small>}
          {fatTarget>0&&<small>Жиры: ещё {fmt(fatRemaining)} г</small>}
          {carbTarget>0&&<small>Углеводы: ещё {fmt(carbRemaining)} г</small>}
        </div>
      </div>
      <Link href="/client/nutrition">Рацион <ChevronRight size={15}/></Link>
    </section>

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

      {premium?<section className="card clientInsightCard">
        <div className="sectionTitleRow"><div><h2>Premium AI‑сводка</h2><span className="muted">Последний персональный отчёт</span></div><Sparkles size={19}/></div>
        {lastDigest?<div className="clientDigestPreview">
          <div className="digestDate">{new Date(lastDigest.for_date+"T12:00:00").toLocaleDateString("ru-RU",{day:"numeric",month:"long"})} · {fmt(lastDigest.kcal)} ккал</div>
          <p>{cleanTelegramMarkdown(lastDigest.summary_md)}</p>
          <Link className="textLink" href="/client/coach">Открыть TeddY Coach →</Link>
        </div>:<div className="clientEmptyNice compact"><Sparkles/><b>Premium изучает твои данные</b><span>Персональные выводы появятся после накопления рациона.</span></div>}
      </section>:<Link className="card clientInsightCard premiumSoftLock" href="/client/plan"><div className="sectionTitleRow"><div><h2>TeddY Premium</h2><span className="muted">Не просто считай — получай следующий шаг</span></div><Sparkles size={19}/></div><div className="clientEmptyNice compact"><Sparkles/><b>Персональный нутрициолог</b><span>Планы дня, Food Memory, рекомендации и недельная стратегия.</span></div></Link>}
    </div>

    <Link href="/client/plan" className={`planTeaser ${d.subscription?.status==="active"&&d.subscription?.plan==="premium"&&(!d.subscription?.ends_at||new Date(d.subscription.ends_at)>new Date())?"premiumActive":""}`}><i><Crown size={20}/></i><span><small>{d.subscription?.status==="active"?"Твой тариф":"Подписка"}</small><b>{d.subscription?.status==="active"?String(d.subscription.plan).toUpperCase():"Открой больше аналитики"}</b><em>{d.subscription?.status==="active"&&d.subscription?.plan==="premium"&&(!d.subscription?.ends_at||new Date(d.subscription.ends_at)>new Date())?"Premium‑функции активны":"Сравнить Basic и Premium"}</em></span><ChevronRight size={18}/></Link>

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
