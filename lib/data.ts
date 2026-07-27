import { getSupabaseAdmin } from './supabase-admin';

export type Meal={
  id:number;chat_id:number;dish:string;grams:number;kcal:number;prot:number;fat:number;carb:number;
  eaten_at:string;eaten_day:string;deleted:boolean
};
export type Profile={id:number;telegram_id:number;first_name:string|null;username:string|null;locale:string|null;created_at:string;avatar_url?:string|null;avatar_file_id?:string|null;avatar_updated_at?:string|null};

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
    {data:weights,error:we},
    {data:payments,error:payE},
    {data:catalog,error:catE}
  ]=await Promise.all([
    s.from('profiles').select('*').order('created_at',{ascending:false}),
    s.from('meals').select('*').eq('deleted',false).order('eaten_at',{ascending:false}),
    s.from('chat_logs').select('*').order('created_at',{ascending:false}).limit(4000),
    s.from('digests').select('*').order('for_date',{ascending:false}).limit(2500),
    s.from('client_settings').select('*'),
    s.from('subscriptions').select('*').order('created_at',{ascending:false}),
    s.from('support_messages').select('*').order('created_at',{ascending:false}).limit(5000),
    s.from('weight_logs').select('*').order('measured_at',{ascending:false}).limit(5000),
    s.from('payment_events').select('*').order('created_at',{ascending:false}).limit(5000),
    s.from('food_catalog').select('id,display_name,use_count,confidence,last_seen_at').order('use_count',{ascending:false}).limit(1000)
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
    weights:we?[]:(weights||[]),
    payments:payE?[]:(payments||[]),
    catalog:catE?[]:(catalog||[])
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
  const {data:messages,error}=await s.from('support_messages')
    .select('id,chat_id,sender,content,created_at,read_by_admin_at')
    .order('created_at',{ascending:false}).limit(1200);
  if(error) throw error;

  const ids=[...new Set((messages||[]).map((m:any)=>Number(m.chat_id)).filter(Number.isFinite))];
  const {data:profiles}=ids.length
    ? await s.from('profiles').select('telegram_id,first_name,username,avatar_url,avatar_file_id,avatar_updated_at').in('telegram_id',ids)
    : {data:[] as any[]};
  const profileMap=new Map((profiles||[]).map((p:any)=>[Number(p.telegram_id),p]));

  const byChat=new Map<number,any[]>();
  for(const m of messages||[]){
    const id=Number(m.chat_id);
    if(!byChat.has(id))byChat.set(id,[]);
    byChat.get(id)!.push(m);
  }

  return [...byChat.entries()].map(([chatId,rows])=>{
    const latest=rows[0];
    const unread=rows.filter((x:any)=>x.sender==='client'&&!x.read_by_admin_at).length;
    return {chatId,profile:profileMap.get(chatId),latest,unread};
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

// --- V17 focused data loaders: keep page payloads narrow and bounded ---
export async function adminClientsData(){
  const s=getSupabaseAdmin();
  const d7=new Date();d7.setDate(d7.getDate()-6);const fromDay=dayKey(d7);
  const d30=new Date(Date.now()-30*86400000).toISOString();
  const [
    {data:profiles,error:pe},{data:settings},{data:subscriptions},{data:meals,error:me},{data:logs}
  ]=await Promise.all([
    s.from('profiles').select('id,telegram_id,first_name,username,created_at,avatar_url,avatar_file_id,avatar_updated_at').order('created_at',{ascending:false}),
    s.from('client_settings').select('chat_id,goal,kcal_target,current_weight_kg,target_weight_kg'),
    s.from('subscriptions').select('chat_id,plan,status,created_at,ends_at').order('created_at',{ascending:false}),
    s.from('meals').select('id,chat_id,dish,kcal,prot,fat,carb,eaten_at,eaten_day,deleted').eq('deleted',false).gte('eaten_day',fromDay).order('eaten_at',{ascending:false}).limit(6000),
    s.from('chat_logs').select('chat_id,created_at').gte('created_at',d30).order('created_at',{ascending:false}).limit(4000)
  ]);
  if(pe)throw pe;if(me)throw me;
  return{profiles:(profiles||[]) as any[],settings:settings||[],subscriptions:subscriptions||[],meals:(meals||[]) as Meal[],logs:logs||[]};
}

export async function adminClientOverviewData(chatId:number){
  const s=getSupabaseAdmin();
  const d14=new Date();d14.setDate(d14.getDate()-13);const fromDay=dayKey(d14);
  const [
    {data:profile},{data:settings},{data:subscription},{data:meals},{data:weights},{count:unread}
  ]=await Promise.all([
    s.from('profiles').select('id,telegram_id,first_name,username,created_at,avatar_url,avatar_file_id,avatar_updated_at').eq('telegram_id',chatId).maybeSingle(),
    s.from('client_settings').select('*').eq('chat_id',chatId).maybeSingle(),
    s.from('subscriptions').select('plan,status,price_rub,started_at,ends_at,created_at').eq('chat_id',chatId).order('created_at',{ascending:false}).limit(1).maybeSingle(),
    s.from('meals').select('id,chat_id,dish,grams,kcal,prot,fat,carb,eaten_at,eaten_day,deleted').eq('chat_id',chatId).eq('deleted',false).gte('eaten_day',fromDay).order('eaten_at',{ascending:false}).limit(1200),
    s.from('weight_logs').select('id,weight_kg,measured_at').eq('chat_id',chatId).order('measured_at',{ascending:false}).limit(12),
    s.from('support_messages').select('id',{count:'exact',head:true}).eq('chat_id',chatId).eq('sender','client').is('read_by_admin_at',null)
  ]);
  return{profile,settings,subscription,meals:(meals||[]) as Meal[],weights:weights||[],unread:unread||0};
}

export async function clientHomeData(chatId:number){
  const s=getSupabaseAdmin();
  const d7=new Date();d7.setDate(d7.getDate()-6);const fromDay=dayKey(d7);
  const [{data:profile},{data:settings},{data:subscription},{data:meals},{data:digests},{data:weights}]=await Promise.all([
    s.from('profiles').select('id,telegram_id,first_name,username,avatar_url,avatar_file_id,avatar_updated_at').eq('telegram_id',chatId).maybeSingle(),
    s.from('client_settings').select('*').eq('chat_id',chatId).maybeSingle(),
    s.from('subscriptions').select('plan,status,ends_at,created_at').eq('chat_id',chatId).order('created_at',{ascending:false}).limit(1).maybeSingle(),
    s.from('meals').select('id,chat_id,dish,grams,kcal,prot,fat,carb,eaten_at,eaten_day,deleted').eq('chat_id',chatId).eq('deleted',false).gte('eaten_day',fromDay).order('eaten_at',{ascending:false}).limit(400),
    s.from('digests').select('id,for_date,kcal,summary_md').eq('chat_id',chatId).order('for_date',{ascending:false}).limit(1),
    s.from('weight_logs').select('id,weight_kg,measured_at').eq('chat_id',chatId).order('measured_at',{ascending:false}).limit(1)
  ]);
  return{profile,settings,subscription,meals:(meals||[]) as Meal[],digests:digests||[],weights:weights||[]};
}

export async function clientProfileData(chatId:number){
  const s=getSupabaseAdmin();
  const [{data:profile},{data:settings},{data:subscription},{data:weights}]=await Promise.all([
    s.from('profiles').select('id,telegram_id,first_name,username,avatar_url,avatar_file_id,avatar_updated_at').eq('telegram_id',chatId).maybeSingle(),
    s.from('client_settings').select('*').eq('chat_id',chatId).maybeSingle(),
    s.from('subscriptions').select('plan,status,price_rub,ends_at,created_at').eq('chat_id',chatId).order('created_at',{ascending:false}).limit(1).maybeSingle(),
    s.from('weight_logs').select('id,weight_kg,measured_at').eq('chat_id',chatId).order('measured_at',{ascending:false}).limit(8)
  ]);
  return{profile,settings,subscription,weights:weights||[]};
}

export async function clientProgressData(chatId:number){
  const s=getSupabaseAdmin();
  const d14=new Date();d14.setDate(d14.getDate()-13);const fromDay=dayKey(d14);
  const [{data:settings},{data:meals},{data:weights},{data:digests}]=await Promise.all([
    s.from('client_settings').select('*').eq('chat_id',chatId).maybeSingle(),
    s.from('meals').select('id,chat_id,dish,grams,kcal,prot,fat,carb,eaten_at,eaten_day,deleted').eq('chat_id',chatId).eq('deleted',false).gte('eaten_day',fromDay).order('eaten_at',{ascending:false}).limit(800),
    s.from('weight_logs').select('id,weight_kg,measured_at').eq('chat_id',chatId).order('measured_at',{ascending:false}).limit(10),
    s.from('digests').select('id,for_date,kcal,summary_md').eq('chat_id',chatId).order('for_date',{ascending:false}).limit(8)
  ]);
  return{settings,meals:(meals||[]) as Meal[],weights:weights||[],digests:digests||[]};
}

export async function clientNutritionData(chatId:number,days=45){
  const s=getSupabaseAdmin();
  const d=new Date();d.setDate(d.getDate()-(days-1));const fromDay=dayKey(d);
  const {data,error}=await s.from('meals').select('id,chat_id,dish,grams,kcal,prot,fat,carb,eaten_at,eaten_day,deleted').eq('chat_id',chatId).eq('deleted',false).gte('eaten_day',fromDay).order('eaten_at',{ascending:false}).limit(1800);
  if(error)throw error;return (data||[]) as Meal[];
}

export async function clientSupportData(chatId:number){
  const s=getSupabaseAdmin();
  const {data,error}=await s.from('support_messages').select('id,chat_id,sender,content,created_at,read_by_admin_at').eq('chat_id',chatId).order('created_at',{ascending:true}).limit(250);
  if(error)throw error;return data||[];
}

export async function adminDashboardData(){
  const s=getSupabaseAdmin();
  const weekIso=new Date(Date.now()-7*86400000).toISOString();
  const today=dayKey();
  const [{data:profiles},{data:settings},{data:subscriptions},{data:meals},{data:logs},{data:weights},{data:support}]=await Promise.all([
    s.from('profiles').select('id,telegram_id,first_name,username,created_at,avatar_url,avatar_file_id,avatar_updated_at').order('created_at',{ascending:false}).limit(500),
    s.from('client_settings').select('chat_id,goal,kcal_target'),
    s.from('subscriptions').select('chat_id,plan,status,created_at').order('created_at',{ascending:false}),
    s.from('meals').select('chat_id,kcal,eaten_at,eaten_day').eq('deleted',false).gte('eaten_day',today).limit(3000),
    s.from('chat_logs').select('chat_id,created_at').gte('created_at',weekIso).order('created_at',{ascending:false}).limit(3000),
    s.from('weight_logs').select('chat_id,measured_at').order('measured_at',{ascending:false}).limit(2000),
    s.from('support_messages').select('chat_id,sender,read_by_admin_at,created_at').gte('created_at',weekIso).order('created_at',{ascending:false}).limit(2000)
  ]);
  return{profiles:profiles||[],settings:settings||[],subscriptions:subscriptions||[],meals:meals||[],logs:logs||[],weights:weights||[],support:support||[]};
}

export async function analyticsData(){
  const s=getSupabaseAdmin();
  const d30=new Date();d30.setDate(d30.getDate()-29);const fromDay=dayKey(d30);const fromIso=new Date(Date.now()-30*86400000).toISOString();
  const [{data:profiles},{data:meals},{data:settings},{data:subscriptions},{data:payments}]=await Promise.all([
    s.from('profiles').select('telegram_id,created_at'),
    s.from('meals').select('chat_id,eaten_at,eaten_day').eq('deleted',false).gte('eaten_day',fromDay).order('eaten_at',{ascending:false}).limit(12000),
    s.from('client_settings').select('chat_id,goal'),
    s.from('subscriptions').select('chat_id,plan,status,created_at').order('created_at',{ascending:false}),
    s.from('payment_events').select('chat_id,amount_rub,status,created_at').gte('created_at',fromIso).order('created_at',{ascending:false}).limit(4000)
  ]);
  return{profiles:profiles||[],meals:(meals||[]) as Meal[],settings:settings||[],subscriptions:subscriptions||[],payments:payments||[]};
}

export async function foodCatalogData(){
  const s=getSupabaseAdmin();
  const {data,error}=await s.from('food_catalog').select('id,display_name,brand,use_count,confidence,last_seen_at,kcal_per_100,prot_per_100,fat_per_100,carb_per_100').order('use_count',{ascending:false}).limit(250);
  if(error)throw error;return data||[];
}
