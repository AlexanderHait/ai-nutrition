import Link from 'next/link';
import {allData,dayKey,fmt,n,sumMeals,Meal} from '@/lib/data';
export const dynamic='force-dynamic';

const TZ='Europe/Moscow';
const key=(d:Date)=>new Intl.DateTimeFormat('sv-SE',{timeZone:TZ}).format(d);
const short=(s:string)=>new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',timeZone:TZ}).format(new Date(`${s}T12:00:00+03:00`));

export default async function Page(){
 const {profiles,meals,logs}=await allData();
 const today=dayKey();
 const dates=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);return key(d)});
 const sevenMeals=meals.filter(m=>dates.includes(m.eaten_day));
 const todayMeals=meals.filter(m=>m.eaten_day===today);
 const activeToday=new Set(todayMeals.map(m=>m.chat_id)).size;
 const todaySum=sumMeals(todayMeals);
 const avgToday=activeToday?todaySum.kcal/activeToday:0;
 const sevenSum=sumMeals(sevenMeals);
 const activeDays=new Set(sevenMeals.map(m=>m.eaten_day)).size||1;
 const dailyAvg={kcal:sevenSum.kcal/activeDays,prot:sevenSum.prot/activeDays,fat:sevenSum.fat/activeDays,carb:sevenSum.carb/activeDays};
 const chart=dates.map(d=>({d,kcal:sumMeals(sevenMeals.filter(m=>m.eaten_day===d)).kcal}));
 const max=Math.max(1,...chart.map(x=>x.kcal));
 const lastActivity=new Map<number,string>();
 for(const m of meals){if(!lastActivity.has(m.chat_id))lastActivity.set(m.chat_id,m.eaten_at)}
 for(const l of logs){const cid=Number((l as any).chat_id);const at=String((l as any).created_at||'');if(cid&&at&&(!lastActivity.has(cid)||new Date(at)>new Date(lastActivity.get(cid)!)))lastActivity.set(cid,at)}
 const attention=profiles.map(p=>{const at=lastActivity.get(p.telegram_id);const days=at?Math.floor((Date.now()-new Date(at).getTime())/86400000):999;return{p,at,days}}).filter(x=>x.days>=3).sort((a,b)=>b.days-a.days).slice(0,8);
 return <>
  <div className="pageHead"><div><p>AI‑Nutrition / Админка</p><h1>Аналитика</h1><span>Только показатели, которые полезны каждый день</span></div></div>
  <div className="stats analyticsStats">
   <Stat l="Активны сегодня" v={`${activeToday} / ${profiles.length}`} sub="клиентов с питанием"/>
   <Stat l="Приёмов сегодня" v={fmt(todayMeals.length)} sub="записано в бот"/>
   <Stat l="Средние ккал сегодня" v={fmt(avgToday)} sub="на активного клиента"/>
  </div>
  <div className="grid2 analyticsGrid">
   <section className="card"><div className="sectionTitleRow"><div><h2>Среднее за 7 дней</h2><span className="muted analyticsHint">По дням, где были записи питания</span></div></div><div className="analyticsMacros"><Macro l="Ккал" v={fmt(dailyAvg.kcal)}/><Macro l="Белки" v={`${fmt(dailyAvg.prot,1)} г`}/><Macro l="Жиры" v={`${fmt(dailyAvg.fat,1)} г`}/><Macro l="Углеводы" v={`${fmt(dailyAvg.carb,1)} г`}/></div></section>
   <section className="card"><div className="sectionTitleRow"><div><h2>Требуют внимания</h2><span className="muted analyticsHint">Нет активности 3+ дня</span></div></div>{attention.length? <div className="attentionList">{attention.map(({p,days})=><Link className="attentionRow" href={`/admin/clients/${p.telegram_id}`} key={p.telegram_id}><div><b>{p.first_name||p.username||p.telegram_id}</b><small>{p.username?`@${p.username}`:`ID ${p.telegram_id}`}</small></div><span>{days>30?'Больше месяца':`${days} дн. без активности`}</span></Link>)}</div>:<div className="analyticsEmpty">Сейчас таких клиентов нет</div>}</section>
  </div>
  <section className="card top"><div className="sectionTitleRow"><div><h2>Калории за 7 дней</h2><span className="muted analyticsHint">Суммарно по всем клиентам</span></div></div><div className="calorieChart">{chart.map(x=><div className="calorieCol" key={x.d}><div className="calorieValue">{fmt(x.kcal)}</div><div className="calorieTrack"><div className="calorieBar" style={{height:`${x.kcal?Math.max(8,(x.kcal/max)*100):0}%`}}/></div><small>{short(x.d)}</small></div>)}</div></section>
 </>
}
function Stat({l,v,sub}:{l:string;v:string;sub:string}){return <div className="stat"><span>{l}</span><b>{v}</b><small className="analyticsSub">{sub}</small></div>}
function Macro({l,v}:{l:string;v:string}){return <div className="analyticsMacro"><span>{l}</span><b>{v}</b></div>}
