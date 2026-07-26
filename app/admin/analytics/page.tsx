import Link from 'next/link';
import {allData,dayKey,fmt,sumMeals} from '@/lib/data';

export const dynamic='force-dynamic';

const TZ='Europe/Moscow';
const key=(d:Date)=>new Intl.DateTimeFormat('sv-SE',{timeZone:TZ}).format(d);
const short=(s:string)=>new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',timeZone:TZ}).format(new Date(`${s}T12:00:00+03:00`));
const weekday=(s:string)=>new Intl.DateTimeFormat('ru-RU',{weekday:'short',timeZone:TZ}).format(new Date(`${s}T12:00:00+03:00`));

export default async function Page(){
 const {profiles,meals,logs}=await allData();
 const today=dayKey();
 const dates=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);return key(d)});
 const sevenMeals=meals.filter(m=>dates.includes(m.eaten_day));
 const todayMeals=meals.filter(m=>m.eaten_day===today);
 const activeToday=new Set(todayMeals.map(m=>m.chat_id)).size;
 const todaySum=sumMeals(todayMeals);
 const avgToday=activeToday?todaySum.kcal/activeToday:0;

 const daily=dates.map(d=>{
   const rows=sevenMeals.filter(m=>m.eaten_day===d);
   const activeClients=new Set(rows.map(m=>m.chat_id)).size;
   const total=sumMeals(rows);
   return{
     d,
     activeClients,
     meals:rows.length,
     total,
     avgPerClient:activeClients?total.kcal/activeClients:0
   };
 });

 const activeClientDays=daily.filter(x=>x.activeClients>0);
 const avg7=activeClientDays.length
   ? activeClientDays.reduce((a,x)=>a+x.avgPerClient,0)/activeClientDays.length
   : 0;

 const macroByClientDay=new Map<string,{kcal:number;prot:number;fat:number;carb:number}>();
 for(const m of sevenMeals){
   const k=`${m.eaten_day}:${m.chat_id}`;
   const prev=macroByClientDay.get(k)||{kcal:0,prot:0,fat:0,carb:0};
   prev.kcal+=Number(m.kcal||0);prev.prot+=Number(m.prot||0);prev.fat+=Number(m.fat||0);prev.carb+=Number(m.carb||0);
   macroByClientDay.set(k,prev);
 }
 const clientDays=[...macroByClientDay.values()];
 const macros=clientDays.length?{
   kcal:clientDays.reduce((a,x)=>a+x.kcal,0)/clientDays.length,
   prot:clientDays.reduce((a,x)=>a+x.prot,0)/clientDays.length,
   fat:clientDays.reduce((a,x)=>a+x.fat,0)/clientDays.length,
   carb:clientDays.reduce((a,x)=>a+x.carb,0)/clientDays.length,
 }:{kcal:0,prot:0,fat:0,carb:0};

 const max=Math.max(1,...daily.map(x=>x.avgPerClient));

 const lastActivity=new Map<number,string>();
 for(const m of meals){if(!lastActivity.has(m.chat_id))lastActivity.set(m.chat_id,m.eaten_at)}
 for(const l of logs){
   const cid=Number((l as any).chat_id),at=String((l as any).created_at||'');
   if(cid&&at&&(!lastActivity.has(cid)||new Date(at)>new Date(lastActivity.get(cid)!)))lastActivity.set(cid,at)
 }
 const attention=profiles
   .map(p=>{const at=lastActivity.get(p.telegram_id);const days=at?Math.floor((Date.now()-new Date(at).getTime())/86400000):999;return{p,days}})
   .filter(x=>x.days>=3).sort((a,b)=>b.days-a.days).slice(0,8);

 return <>
  <div className="pageHead">
    <div><p>AI‑Nutrition / Админка</p><h1>Аналитика</h1><span>Понятная картина активности и питания клиентов</span></div>
  </div>

  <div className="stats analyticsStats">
   <Stat l="Активны сегодня" v={`${activeToday} / ${profiles.length}`} sub="клиентов с питанием"/>
   <Stat l="Приёмов сегодня" v={fmt(todayMeals.length)} sub="позиций еды записано"/>
   <Stat l="Средние ккал сегодня" v={fmt(avgToday)} sub="на активного клиента"/>
  </div>

  <section className="card analyticsHero top">
    <div className="analyticsHeroCopy">
      <span>Среднее за 7 дней</span>
      <b>{fmt(avg7)} ккал</b>
      <small>на одного активного клиента в день</small>
    </div>
    <div className="analyticsMacros compact">
      <Macro l="Белки" v={`${fmt(macros.prot,1)} г`}/>
      <Macro l="Жиры" v={`${fmt(macros.fat,1)} г`}/>
      <Macro l="Углеводы" v={`${fmt(macros.carb,1)} г`}/>
    </div>
  </section>

  <section className="card top">
    <div className="sectionTitleRow">
      <div>
        <h2>Калории за 7 дней</h2>
        <span className="muted analyticsHint">Среднее на активного клиента — сравнивать дни теперь корректно</span>
      </div>
    </div>

    <div className="calorieChart readableChart">
      {daily.map(x=><div className="calorieCol" key={x.d}>
        <div className="calorieValue">{x.activeClients?fmt(x.avgPerClient):'—'}</div>
        <div className="calorieTrack">
          <div className="calorieBar" style={{height:`${x.avgPerClient?Math.max(10,(x.avgPerClient/max)*100):0}%`}}/>
        </div>
        <small><b>{weekday(x.d)}</b>{short(x.d)}</small>
        <em>{x.activeClients?`${x.activeClients} кл.`:'нет данных'}</em>
      </div>)}
    </div>
  </section>

  <section className="card top">
    <div className="sectionTitleRow">
      <div><h2>Требуют внимания</h2><span className="muted analyticsHint">Нет активности 3+ дня</span></div>
    </div>
    {attention.length?
      <div className="attentionList">
        {attention.map(({p,days})=><Link className="attentionRow" href={`/admin/clients/${p.telegram_id}`} key={p.telegram_id}>
          <div><b>{p.first_name||p.username||p.telegram_id}</b><small>{p.username?`@${p.username}`:`ID ${p.telegram_id}`}</small></div>
          <span>{days>30?'Больше месяца':`${days} дн. без активности`}</span>
        </Link>)}
      </div>:
      <div className="analyticsEmpty">Сейчас таких клиентов нет</div>}
  </section>
 </>
}

function Stat({l,v,sub}:{l:string;v:string;sub:string}){return <div className="stat"><span>{l}</span><b>{v}</b><small className="analyticsSub">{sub}</small></div>}
function Macro({l,v}:{l:string;v:string}){return <div className="analyticsMacro"><span>{l}</span><b>{v}</b></div>}
