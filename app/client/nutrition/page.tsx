import {requireClient} from '@/lib/auth';
import {clientData,fmt,mealSessions,sumMeals} from '@/lib/data';

export const dynamic='force-dynamic';

type SearchParams=Promise<{day?:string}>;

function dayLabel(day:string){
  return new Date(day+'T12:00:00').toLocaleDateString('ru-RU',{
    day:'numeric',month:'long',weekday:'short'
  });
}

export default async function Page({searchParams}:{searchParams:SearchParams}){
  const s=await requireClient();
  const d=await clientData(s.chatId!);
  const q=await searchParams;
  const selected=typeof q.day==='string'?q.day:'';

  const groups=new Map<string,typeof d.meals>();
  for(const m of d.meals){
    if(!groups.has(m.eaten_day))groups.set(m.eaten_day,[]);
    groups.get(m.eaten_day)!.push(m);
  }

  let entries=[...groups.entries()];
  if(selected){
    entries.sort(([a],[b])=>a===selected?-1:b===selected?1:b.localeCompare(a));
  }

  return <>
    <div className="pageHead nutritionPageHead">
      <div>
        <p>История</p>
        <h1>Питание</h1>
        <span>Приёмы пищи по дням — без лишнего шума</span>
      </div>
    </div>

    <div className="nutritionDays">
      {entries.slice(0,30).map(([day,rows])=>{
        const total=sumMeals(rows);
        const sessions=mealSessions(rows).reverse();
        const active=day===selected;

        return <section
          className={`nutritionDay${active?' selectedDay':''}`}
          id={`day-${day}`}
          key={day}
        >
          <header className="nutritionDayHead">
            <div>
              <h2>{dayLabel(day)}</h2>
              <span>{sessions.length} {sessions.length===1?'приём':'приёма'} · {fmt(total.kcal)} ккал</span>
            </div>
            <div className="nutritionDayMacros">
              <span>Б {fmt(total.prot,1)}</span>
              <span>Ж {fmt(total.fat,1)}</span>
              <span>У {fmt(total.carb,1)}</span>
            </div>
          </header>

          <div className="mealSessions">
            {sessions.map((session,idx)=>(
              <details className="mealSession" key={session.key} open={active&&idx===0}>
                <summary>
                  <div className="mealSessionMain">
                    <time>{session.time}</time>
                    <div>
                      <b>
                        {session.meals.length===1
                          ? session.meals[0].dish
                          : `${session.meals.length} позиций`}
                      </b>
                      <small>
                        {session.meals.length===1
                          ? `${fmt(session.meals[0].grams)} г`
                          : session.meals.slice(0,3).map(x=>x.dish).join(' · ')+(session.meals.length>3?'…':'')}
                      </small>
                    </div>
                  </div>
                  <div className="mealSessionTotal">
                    <b>{fmt(session.total.kcal)} ккал</b>
                    <small>Б {fmt(session.total.prot,1)} · Ж {fmt(session.total.fat,1)} · У {fmt(session.total.carb,1)}</small>
                  </div>
                </summary>

                {session.meals.length>1&&
                  <div className="mealSessionItems">
                    {session.meals.map(m=>(
                      <div className="compactMeal" key={m.id}>
                        <div>
                          <b>{m.dish}</b>
                          <small>{fmt(m.grams)} г</small>
                        </div>
                        <span>{fmt(m.kcal)} ккал</span>
                      </div>
                    ))}
                  </div>}
              </details>
            ))}
          </div>
        </section>
      })}
      {!entries.length&&<section className="card"><span className="muted">Пока нет сохранённых приёмов пищи.</span></section>}
    </div>
  </>;
}
