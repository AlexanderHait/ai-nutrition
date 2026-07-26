import { getSupabaseAdmin } from './supabase-admin';

export type Meal={
  id:number;chat_id:number;dish:string;grams:number;kcal:number;prot:number;fat:number;carb:number;
  eaten_at:string;eaten_day:string;deleted:boolean
};
export type Profile={id:number;telegram_id:number;first_name:string|null;username:string|null;locale:string|null;created_at:string};

export async function allData(){
  const s=getSupabaseAdmin();
  const [
    {data:profiles,error:pe},
    {data:meals,error:me},
    {data:logs,error:le},
    {data:digests,error:de},
    {data:settings},
    {data:subscriptions},
    {data:support,error:se},
    {data:weights,error:we}
  ]=await Promise.all([
    s.from('profiles').select('*').order('created_at',{ascending:false}),
    s.from('meals').select('*').eq('deleted',false).order('eaten_at',{ascending:false}),
    s.from('chat_logs').select('*').order('created_at',{ascending:false}).limit(4000),
    s.from('digests').select('*').order('for_date',{ascending:false}).limit(2500),
    s.from('client_settings').select('*'),
    s.from('subscriptions').select('*').order('created_at',{ascending:false}),
    s.from('support_messages').select('*').order('created_at',{ascending:false}).limit(5000),
    s.from('weight_logs').select('*').order('measured_at',{ascending:false}).limit(5000)
  ]);
  if(pe)throw pe;
  if(me)throw me;
  return{
    profiles:(profiles||[]) as Profile[],
    meals:(meals||[]) as Meal[],
    logs:le?[]:(logs||[]),
    digests:de?[]:(digests||[]),
    settings:settings||[],
    subscriptions:subscriptions||[],
    support:se?[]:(support||[]),
    weights:we?[]:(weights||[])
  };
}

export async function clientData(chatId:number){
  const s=getSupabaseAdmin();
  const [
    {data:profile},{data:meals},{data:logs},{data:digests},{data:settings},{data:weights},{data:sub},
    {data:events},{data:support}
  ]=await Promise.all([
    s.from('profiles').select('*').eq('telegram_id',chatId).maybeSingle(),
    s.from('meals').select('*').eq('chat_id',chatId).eq('deleted',false).order('eaten_at',{ascending:false}).limit(800),
    s.from('chat_logs').select('*').eq('chat_id',chatId).order('created_at',{ascending:false}).limit(400),
    s.from('digests').select('*').eq('chat_id',chatId).order('for_date',{ascending:false}).limit(120),
    s.from('client_settings').select('*').eq('chat_id',chatId).maybeSingle(),
    s.from('weight_logs').select('*').eq('chat_id',chatId).order('measured_at',{ascending:false}).limit(150),
    s.from('subscriptions').select('*').eq('chat_id',chatId).order('created_at',{ascending:false}).limit(1).maybeSingle(),
    s.from('bot_events').select('*').eq('chat_id',chatId).order('created_at',{ascending:false}).limit(100),
    s.from('support_messages').select('*').eq('chat_id',chatId).order('created_at',{ascending:true}).limit(700)
  ]);
  return{
    profile,meals:(meals||[]) as Meal[],logs:logs||[],digests:digests||[],settings,weights:weights||[],
    subscription:sub,events:events||[],support:support||[]
  };
}

export async function supportThreads(){
  const s=getSupabaseAdmin();
  const [{data:profiles},{data:messages,error}]=await Promise.all([
    s.from('profiles').select('*'),
    s.from('support_messages').select('*').order('created_at',{ascending:false}).limit(5000)
  ]);
  if(error) throw error;

  const byChat=new Map<number,any[]>();
  for(const m of messages||[]){
    const id=Number(m.chat_id);
    if(!byChat.has(id))byChat.set(id,[]);
    byChat.get(id)!.push(m);
  }

  return [...byChat.entries()].map(([chatId,rows])=>{
    const latest=rows[0];
    const unread=rows.filter((x:any)=>x.sender==='client'&&!x.read_by_admin_at).length;
    const profile=(profiles||[]).find((p:any)=>Number(p.telegram_id)===chatId);
    return {chatId,profile,latest,unread};
  }).sort((a,b)=>{
    if(b.unread!==a.unread)return b.unread-a.unread;
    return new Date(b.latest.created_at).getTime()-new Date(a.latest.created_at).getTime();
  });
}

export async function supportMessages(chatId:number){
  const s=getSupabaseAdmin();
  const {data,error}=await s.from('support_messages').select('*').eq('chat_id',chatId).order('created_at',{ascending:true}).limit(700);
  if(error)throw error;
  return data||[];
}

export const n=(v:any)=>Number(v||0);
export const fmt=(v:any,d=0)=>n(v).toLocaleString('ru-RU',{maximumFractionDigits:d});
export function dayKey(d=new Date()){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Moscow'}).format(d)}
export function mealDay(m:Pick<Meal,'eaten_at'|'eaten_day'>){
  if(m.eaten_day)return String(m.eaten_day).slice(0,10);
  return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Moscow'}).format(new Date(m.eaten_at));
}
export function sumMeals(rows:Meal[]){return rows.reduce((a,m)=>({kcal:a.kcal+n(m.kcal),prot:a.prot+n(m.prot),fat:a.fat+n(m.fat),carb:a.carb+n(m.carb)}),{kcal:0,prot:0,fat:0,carb:0})}

export type MealSession={
  key:string;
  day:string;
  time:string;
  eatenAt:string;
  meals:Meal[];
  total:{kcal:number;prot:number;fat:number;carb:number};
};

export function mealSessions(rows:Meal[], gapMinutes=12):MealSession[]{
  const sorted=[...rows].sort((a,b)=>new Date(a.eaten_at).getTime()-new Date(b.eaten_at).getTime());
  const sessions:MealSession[]=[];
  for(const meal of sorted){
    const ts=new Date(meal.eaten_at).getTime();
    const day=mealDay(meal);
    const prev=sessions[sessions.length-1];
    const prevTs=prev?new Date(prev.eatenAt).getTime():0;
    if(prev&&prev.day===day&&ts-prevTs<=gapMinutes*60000){
      prev.meals.push(meal);
      prev.eatenAt=meal.eaten_at;
      prev.total=sumMeals(prev.meals);
      continue;
    }
    const time=new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',hour:'2-digit',minute:'2-digit'}).format(new Date(meal.eaten_at));
    sessions.push({
      key:`${day}-${meal.eaten_at}-${meal.id}`,
      day,time,eatenAt:meal.eaten_at,meals:[meal],total:sumMeals([meal])
    });
  }
  return sessions.sort((a,b)=>new Date(b.eatenAt).getTime()-new Date(a.eatenAt).getTime());
}

export function pluralMeals(value:number){
  const n=Math.abs(value)%100, n1=n%10;
  if(n>10&&n<20)return 'приёмов';
  if(n1===1)return 'приём';
  if(n1>=2&&n1<=4)return 'приёма';
  return 'приёмов';
}


export function goalKind(value:any){
  const s=String(value||"").toLowerCase();
  if(s.includes("loss")||s.includes("сниж")||s.includes("похуд"))return "Снижение веса";
  if(s.includes("gain")||s.includes("набор"))return "Набор массы";
  if(s.includes("maint")||s.includes("поддерж"))return "Поддержание";
  return value||"Цель не указана";
}
