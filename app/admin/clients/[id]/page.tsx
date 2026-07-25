import Link from 'next/link';
import {clientData,dayKey,fmt,sumMeals} from '@/lib/data';

export const dynamic='force-dynamic';

function cleanTelegramMarkdown(value:string){
  return value
    .replace(/\*\*(.*?)\*\*/g,'$1')
    .replace(/__(.*?)__/g,'$1')
    .replace(/\*(.*?)\*/g,'$1')
    .replace(/_(.*?)_/g,'$1')
    .replace(/`([^`]+)`/g,'$1')
    .trim();
}

function mealDate(value:string){
  return new Date(value).toLocaleString('ru-RU',{
    day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Moscow'
  });
}

export default async function Page({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const chatId=Number(id);
  const d=await clientData(chatId);
  if(!d.profile)return <div>Клиент не найден</div>;

  const today=dayKey();
  const todayMeals=d.meals.filter(m=>m.eaten_day===today);
  const todaySum=sumMeals(todayMeals);
  const recentMeals=d.meals.slice(0,8);
  const lastDigest=d.digests[0];
  const recentLogs=d.logs.slice(0,6).reverse();

  return <>
    <Link className="back" href="/admin/clients">← Клиенты</Link>

    <div className="profileHero compactHero">
      <div className="avatar">{(d.profile.first_name||'К')[0]}</div>
      <div>
        <h1>{d.profile.first_name||'Без имени'}</h1>
        <p>{d.profile.username?'@'+d.profile.username:String(chatId)}</p>
      </div>
    </div>

    <section className="card todayCard">
      <div className="sectionTitleRow">
        <div>
          <h2>Сегодня</h2>
          <span className="muted">{todayMeals.length} {todayMeals.length===1?'приём':'приёма'} пищи</span>
        </div>
      </div>
      <div className="miniStats">
        <MiniStat l="Калории" v={`${fmt(todaySum.kcal)} ккал`}/>
        <MiniStat l="Белки" v={`${fmt(todaySum.prot,1)} г`}/>
        <MiniStat l="Жиры" v={`${fmt(todaySum.fat,1)} г`}/>
        <MiniStat l="Углеводы" v={`${fmt(todaySum.carb,1)} г`}/>
      </div>
    </section>

    <div className="grid2 clientCoreGrid">
      <section className="card">
        <div className="sectionTitleRow"><h2>Последние приёмы пищи</h2></div>
        {recentMeals.length?recentMeals.map(m=><div className="meal" key={m.id}>
          <div>
            <b>{m.dish}</b>
            <small>{mealDate(m.eaten_at)} · {fmt(m.grams)} г</small>
          </div>
          <div>
            <b>{fmt(m.kcal)} ккал</b>
            <small>Б {fmt(m.prot,1)} · Ж {fmt(m.fat,1)} · У {fmt(m.carb,1)}</small>
          </div>
        </div>):<Empty/>}
      </section>

      <section className="card">
        <div className="sectionTitleRow"><h2>Последний AI‑отчёт</h2></div>
        {lastDigest?<>
          <div className="digestMeta">{new Date(lastDigest.for_date+'T12:00:00').toLocaleDateString('ru-RU')}</div>
          <div className="digest cleanDigest">{cleanTelegramMarkdown(lastDigest.summary_md||'')}</div>
        </>:<Empty/>}
      </section>
    </div>

    <section className="card top">
      <div className="sectionTitleRow">
        <h2>Последние сообщения</h2>
        <Link href="/admin/dialogs" className="textLink">Весь диалог →</Link>
      </div>
      {recentLogs.length?recentLogs.map((x:any)=><div className={'chat '+x.role} key={x.id}>
        <b>{x.role==='user'?'Клиент':'AI'}</b>
        <p>{x.content}</p>
      </div>):<Empty/>}
    </section>
  </>;
}

function MiniStat({l,v}:{l:string;v:string}){return <div className="miniStat"><span>{l}</span><b>{v}</b></div>}
function Empty(){return <p className="muted">Пока нет данных.</p>}
