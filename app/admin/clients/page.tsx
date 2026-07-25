import { getSupabaseAdmin } from '../../../lib/supabase-admin'

export const dynamic = 'force-dynamic'

type Profile = {
  id: number
  telegram_id: number
  first_name: string | null
  username: string | null
  locale: string | null
  created_at: string
}

type Meal = {
  chat_id: number
  kcal: number | null
  prot: number | null
  fat: number | null
  carb: number | null
  eaten_at: string | null
  deleted: boolean | null
}

export default async function ClientsPage() {
  const supabase = getSupabaseAdmin()

  const [{ data: profiles, error: profilesError }, { data: meals, error: mealsError }] =
    await Promise.all([
      supabase.from('profiles').select('id,telegram_id,first_name,username,locale,created_at').order('created_at', { ascending: false }),
      supabase.from('meals').select('chat_id,kcal,prot,fat,carb,eaten_at,deleted').eq('deleted', false)
    ])

  if (profilesError) throw profilesError
  if (mealsError) throw mealsError

  const mealRows = (meals ?? []) as Meal[]
  const profileRows = (profiles ?? []) as Profile[]

  const stats = new Map<number, { meals: number; kcal: number; lastMeal: string | null }>()
  for (const meal of mealRows) {
    const current = stats.get(meal.chat_id) ?? { meals: 0, kcal: 0, lastMeal: null }
    current.meals += 1
    current.kcal += Number(meal.kcal ?? 0)
    if (meal.eaten_at && (!current.lastMeal || meal.eaten_at > current.lastMeal)) current.lastMeal = meal.eaten_at
    stats.set(meal.chat_id, current)
  }

  return (
    <main style={{padding:'40px',maxWidth:'1200px',margin:'0 auto'}}>
      <div style={{marginBottom:'32px'}}>
        <div style={{fontSize:'14px',color:'#d7b55b',marginBottom:'8px'}}>AI-Nutrition / Админка</div>
        <h1 style={{fontSize:'42px',margin:'0 0 8px'}}>Клиенты</h1>
        <p style={{color:'#999'}}>Реальные пользователи Telegram и данные питания из Supabase</p>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:'16px',marginBottom:'28px'}}>
        <Stat label="Клиентов" value={profileRows.length.toLocaleString('ru-RU')} />
        <Stat label="Приёмов пищи" value={mealRows.length.toLocaleString('ru-RU')} />
        <Stat label="Ккал за всё время" value={Math.round(mealRows.reduce((s,m)=>s+Number(m.kcal??0),0)).toLocaleString('ru-RU')} />
      </div>

      <div style={{border:'1px solid #252525',borderRadius:'18px',overflow:'hidden',background:'#0d0d0f'}}>
        <div style={{display:'grid',gridTemplateColumns:'2fr 1.3fr .8fr .9fr',padding:'16px 20px',color:'#777',borderBottom:'1px solid #222'}}>
          <span>Клиент</span><span>Telegram</span><span>Приёмов</span><span>Последняя еда</span>
        </div>
        {profileRows.map((p) => {
          const s = stats.get(Number(p.telegram_id)) ?? { meals: 0, kcal: 0, lastMeal: null }
          return (
            <div key={p.id} style={{display:'grid',gridTemplateColumns:'2fr 1.3fr .8fr .9fr',padding:'18px 20px',borderBottom:'1px solid #191919',alignItems:'center'}}>
              <div>
                <div style={{fontWeight:700}}>{p.first_name || 'Без имени'}</div>
                <div style={{fontSize:'13px',color:'#777'}}>{p.locale || '—'} · {Math.round(s.kcal).toLocaleString('ru-RU')} ккал всего</div>
              </div>
              <div style={{color:'#aaa'}}>{p.username ? '@'+p.username : String(p.telegram_id)}</div>
              <div>{s.meals}</div>
              <div style={{color:'#aaa'}}>{s.lastMeal ? new Date(s.lastMeal).toLocaleDateString('ru-RU') : '—'}</div>
            </div>
          )
        })}
        {profileRows.length === 0 && <div style={{padding:'28px',color:'#888'}}>Пользователей пока нет.</div>}
      </div>
    </main>
  )
}

function Stat({label,value}:{label:string,value:string}) {
  return <div style={{padding:'22px',border:'1px solid #252525',borderRadius:'16px',background:'#0d0d0f'}}>
    <div style={{color:'#888',fontSize:'14px'}}>{label}</div>
    <div style={{fontSize:'30px',fontWeight:800,marginTop:'8px'}}>{value}</div>
  </div>
}
