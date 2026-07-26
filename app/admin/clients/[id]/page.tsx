import Link from 'next/link';
import {AlertTriangle,Apple,Beef,CalendarDays,Cookie,CupSoda,MessageSquare,Salad,Sandwich,Scale,Target,TrendingUp,Utensils} from 'lucide-react';
import {clientData,dayKey,fmt,goalKind,mealSessions,pluralMeals,sumMeals} from '@/lib/data';
export const dynamic='force-dynamic';

function FoodIcon({dish}:{dish:string}){
  const s=dish.toLowerCase();
  const I=s.includes('салат')?Salad:s.includes('бургер')||s.includes('сэндв')?Sandwich:s.includes('мяс')||s.includes('кур')||s.includes('гов')?Beef:s.includes('ябл')||s.includes('фрукт')?Apple:s.includes('напит')||s.includes('коф')||s.includes('чай')?CupSoda:s.includes('печ')||s.includes('конф')||s.includes('шокол')?Cookie:Utensils;
  return <I size={20}/>;
}
function prettyDay(day:string){return new Date(`${day}T12:00:00`).toLocaleDateString('ru-RU',{day:'numeric',month:'short',weekday:'short'});}
function pct(v:number,t:number){return t?Math.min(100,Math.round(v/t*100)):0}

export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{day?:string}>}){
  const {id}=await params;
  const qp=await searchParams;
  const chatId=Number(id),d=await clientData(chatId);
  if(!d.profile)return <div>Клиент не найден</div>;

  const today=dayKey();
  const selectedDay=qp.day&&/^\d{4}-\d{2}-\d{2}$/.test(qp.day)?qp.day:today;
  const selectedMeals=d.meals.filter(m=>m.eaten_day===selectedDay);
  const selectedSum=sumMeals(selectedMeals);
  const selectedSessions=mealSessions(selectedMeals);

  const st:any=d.settings||{};
  const target=Number(st.kcal_target||0);
  const protTarget=Number(st.protein_target_g||st.prot_target||0);
  const fatTarget=Number(st.fat_target_g||0);
  const carbTarget=Number(st.carb_target_g||0);
  const cw=Number(st.current_weight_kg||d.weights?.[0]?.weight_kg||0);
  const tw=Number(st.target_weight_kg||0);

  const recentDays=Array.from({length:14},(_,i)=>{
    const date=new Date();date.setDate(date.getDate()-(13-i));
    const day=dayKey(date);
    const meals=d.meals.filter(m=>m.eaten_day===day);
    return{day,total:sumMeals(meals),sessions:mealSessions(meals).length};
  });
  const week=recentDays.slice(-7);
  const avg7=Math.round(week.reduce((a,x)=>a+x.total.kcal,0)/7);
  const proteinLow=protTarget>0 ? week.filter(x=>x.total.prot>0&&x.total.prot<protTarget*.75).length : 0;
  const activeDays=week.filter(x=>x.sessions>0).length;
  const unread=(d.support as any[]).filter(x=>x.sender==='client'&&!x.read_by_admin_at).length;

  const observations:string[]=[];
  if(target>0)observations.push(`Среднее за 7 дней: ${avg7} ккал — ${Math.round(avg7/target*100)}% от цели.`);
  if(proteinLow>=3)observations.push(`Белок ниже 75% нормы в ${proteinLow} днях из 7.`);
  if(activeDays<5)observations.push(`Питание зафиксировано только в ${activeDays} днях из 7.`);
  if(d.weights.length===0)observations.push('Вес ещё не вносился.');
  if(unread)observations.push(`${unread} непрочитанных обращений клиента.`);
  if(!observations.length)observations.push('Выраженных отклонений за последние 7 дней не обнаружено.');

  const max=Math.max(target,1,...week.map(x=>x.total.kcal));
  const weightRows=(d.weights as any[]).slice(0,8);

  return <>
    <Link className="back" href="/admin/clients">← Назад к списку</Link>
    <div className="clientHeroV3">
      <div className="avatar large">{String(d.profile.first_name||'К')[0]}</div>
      <div className="clientHeroInfo">
        <div className="clientNameLine"><h1>{d.profile.first_name||'Без имени'}</h1><span className={`planPill ${d.subscription?.plan||'none'}`}>{d.subscription?.status==='active'?String(d.subscription.plan).toUpperCase():'БЕЗ ПОДПИСКИ'}</span></div>
        <p>{d.profile.username?'@'+d.profile.username:`Telegram ${chatId}`}</p>
        <div className="clientTags"><span><Target size={13}/>{goalKind(st.goal)}</span>{cw>0&&<span><Scale size={13}/>{cw} кг</span>}</div>
      </div>
      <div className="clientHeroActions">
        <Link className="primary compactBtn" href={`/admin/dialogs?chat=${chatId}`}><MessageSquare size={16}/>Написать{unread?` (${unread})`:''}</Link>
        <Link className="secondaryBtn" href="#nutrition"><CalendarDays size={16}/>Питание</Link>
      </div>
    </div>

    <div className="clientOverviewGrid">
      <section className="card nutritionRingCard">
        <div className="sectionTitleRow"><div><h2>Питание — {prettyDay(selectedDay)}</h2><span className="muted">{selectedSessions.length} {pluralMeals(selectedSessions.length)}</span></div></div>
        <div className="ringWrap"><div className="calorieRing" style={{'--progress':`${pct(selectedSum.kcal,target)}%`} as React.CSSProperties}><b>{fmt(selectedSum.kcal)}</b><span>/ {target?fmt(target):'—'} ккал</span></div></div>
        <div className="macroStrip">
          <span><b>{fmt(selectedSum.prot,1)} г</b>Белки<small>{protTarget?`${pct(selectedSum.prot,protTarget)}% нормы`:''}</small></span>
          <span><b>{fmt(selectedSum.fat,1)} г</b>Жиры<small>{fatTarget?`${pct(selectedSum.fat,fatTarget)}% нормы`:''}</small></span>
          <span><b>{fmt(selectedSum.carb,1)} г</b>Углеводы<small>{carbTarget?`${pct(selectedSum.carb,carbTarget)}% нормы`:''}</small></span>
        </div>
      </section>

      <section className="card clientFactsCard">
        <h2>Профиль и цель</h2>
        <div className="clientFacts">
          <div className="clientFact"><span>Цель</span><b>{goalKind(st.goal)}</b></div>
          <div className="clientFact"><span>Калории</span><b>{target?`${fmt(target)} ккал`:'Не указано'}</b></div>
          <div className="clientFact"><span>Текущий вес</span><b>{cw?`${cw} кг`:'Не указан'}</b></div>
          <div className="clientFact"><span>Целевой вес</span><b>{tw?`${tw} кг`:'Не указан'}</b></div>
          <div className="clientFact"><span>Рост</span><b>{st.height_cm?`${st.height_cm} см`:'Не указан'}</b></div>
          <div className="clientFact"><span>Активность</span><b>{st.activity_level||'Не указана'}</b></div>
        </div>
        {cw>0&&tw>0&&<div className="weightTarget">До цели: <b>{Math.abs(cw-tw).toFixed(1)} кг</b></div>}
      </section>

      <section className="card aiObservations">
        <div className="sectionTitleRow"><div><h2>Наблюдения</h2><span className="muted">Автоматически по данным за 7 дней</span></div><TrendingUp size={19}/></div>
        <div>{observations.map((x,i)=><p key={i}><AlertTriangle size={15}/><span>{x}</span></p>)}</div>
      </section>
    </div>

    <section className="card top">
      <div className="sectionTitleRow"><div><h2>Календарь питания</h2><span className="muted">Выбери день, чтобы открыть его приёмы</span></div></div>
      <div className="clientCalendar">
        {recentDays.map(x=><Link href={`/admin/clients/${chatId}?day=${x.day}#nutrition`} className={`${x.day===selectedDay?'active ':''}${x.sessions?'hasData':''}`} key={x.day}>
          <span>{prettyDay(x.day).split(',')[0]}</span><b>{new Date(`${x.day}T12:00:00`).getDate()}</b><small>{x.sessions?`${x.sessions} ${pluralMeals(x.sessions)}`:'—'}</small>
        </Link>)}
      </div>
    </section>

    <div className="clientDetailsGrid top">
      <section className="card">
        <div className="sectionTitleRow"><div><h2>Калории за 7 дней</h2><span className="muted">Цель отмечена пунктиром</span></div><b className="chartAverage">Ø {avg7} ккал</b></div>
        <div className="clientWeekChart">
          {week.map(x=><div className="clientWeekCol" key={x.day}>
            <span>{Math.round(x.total.kcal)||''}</span>
            <div className="clientWeekTrack"><i style={{height:`${Math.max(4,x.total.kcal/max*100)}%`}}/>{target>0&&<em style={{bottom:`${Math.min(100,target/max*100)}%`}}/>}</div>
            <small>{new Date(`${x.day}T12:00:00`).toLocaleDateString('ru-RU',{weekday:'short'})}</small>
          </div>)}
        </div>
      </section>

      <section className="card">
        <div className="sectionTitleRow"><div><h2>Динамика веса</h2><span className="muted">Последние измерения</span></div></div>
        {weightRows.length?<div className="weightHistory">{weightRows.map((w:any)=><div className="row" key={w.id}><span>{new Date(w.measured_at).toLocaleDateString('ru-RU',{day:'2-digit',month:'short'})}</span><b>{Number(w.weight_kg).toFixed(1)} кг</b></div>)}</div>:<div className="emptyState"><Scale/><b>Нет измерений</b><span>Вес появится после первого внесения клиентом.</span></div>}
      </section>
    </div>

    <section className="card top" id="nutrition">
      <div className="sectionTitleRow"><div><h2>Приёмы пищи — {prettyDay(selectedDay)}</h2><span className="muted">{selectedMeals.length} продуктов в {selectedSessions.length} {pluralMeals(selectedSessions.length)}</span></div></div>
      {selectedSessions.length?<div className="visualMeals">{selectedSessions.map(session=><article className="visualMealSession" key={session.key}>
        <header><div><b>{session.time}</b><span>{session.meals.length} поз.</span></div><strong>{fmt(session.total.kcal)} ккал</strong></header>
        <div>{session.meals.map(m=><div className="visualMealItem" key={m.id}><i><FoodIcon dish={m.dish}/></i><span><b>{m.dish}</b><small>{fmt(m.grams)} г · Б {fmt(m.prot,1)} · Ж {fmt(m.fat,1)} · У {fmt(m.carb,1)}</small></span><strong>{fmt(m.kcal)} ккал</strong></div>)}</div>
      </article>)}</div>:<div className="emptyState"><Utensils/><b>В этот день нет записей</b><span>Выбери другой день в календаре.</span></div>}
    </section>
  </>;
}
