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
    .select('id,chat_id,sender,content,created_at,read_by_admin_at,attachment_path,attachment_name,attachment_mime')
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
  const [{data:settings},{data:meals},{data:weights},{data:digests},{data:subscription}]=await Promise.all([
    s.from('client_settings').select('*').eq('chat_id',chatId).maybeSingle(),
    s.from('meals').select('id,chat_id,dish,grams,kcal,prot,fat,carb,eaten_at,eaten_day,deleted').eq('chat_id',chatId).eq('deleted',false).gte('eaten_day',fromDay).order('eaten_at',{ascending:false}).limit(800),
    s.from('weight_logs').select('id,weight_kg,measured_at').eq('chat_id',chatId).order('measured_at',{ascending:false}).limit(10),
    s.from('digests').select('id,for_date,kcal,summary_md').eq('chat_id',chatId).order('for_date',{ascending:false}).limit(8),
    s.from('subscriptions').select('plan,status,ends_at,created_at').eq('chat_id',chatId).order('created_at',{ascending:false}).limit(1).maybeSingle()
  ]);
  return{settings,meals:(meals||[]) as Meal[],weights:weights||[],digests:digests||[],subscription};
}

export async function clientNutritionData(chatId:number,days=45){
  const s=getSupabaseAdmin();
  const d=new Date();d.setDate(d.getDate()-(days-1));const fromDay=dayKey(d);
  const {data,error}=await s.from('meals').select('id,chat_id,dish,grams,kcal,prot,fat,carb,eaten_at,eaten_day,deleted').eq('chat_id',chatId).eq('deleted',false).gte('eaten_day',fromDay).order('eaten_at',{ascending:false}).limit(1800);
  if(error)throw error;return (data||[]) as Meal[];
}

export async function clientSupportData(chatId:number){
  const s=getSupabaseAdmin();
  const {data,error}=await s.from('support_messages').select('*').eq('chat_id',chatId).order('created_at',{ascending:true}).limit(250);
  if(error)throw error;return data||[];
}

export async function adminDashboardData(){
  const s=getSupabaseAdmin();
  const weekIso=new Date(Date.now()-7*86400000).toISOString();
  const today=dayKey();
  const [{data:profiles},{data:settings},{data:subscriptions},{data:meals},{data:logs},{data:weights},{data:support}]=await Promise.all([
    s.from('profiles').select('id,telegram_id,first_name,username,created_at,avatar_url,avatar_file_id,avatar_updated_at').order('created_at',{ascending:false}).limit(500),
    s.from('client_settings').select('chat_id,goal,kcal_target'),
    s.from('subscriptions').select('chat_id,plan,status,ends_at,created_at').order('created_at',{ascending:false}),
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
    s.from('subscriptions').select('chat_id,plan,status,ends_at,created_at').order('created_at',{ascending:false}),
    s.from('payment_events').select('chat_id,amount_rub,status,created_at').gte('created_at',fromIso).order('created_at',{ascending:false}).limit(4000)
  ]);
  return{profiles:profiles||[],meals:(meals||[]) as Meal[],settings:settings||[],subscriptions:subscriptions||[],payments:payments||[]};
}

export async function foodCatalogData(){
  const s=getSupabaseAdmin();
  const {data,error}=await s.from('food_catalog').select('id,display_name,brand,use_count,confidence,last_seen_at,kcal_per_100,prot_per_100,fat_per_100,carb_per_100').order('use_count',{ascending:false}).limit(250);
  if(error)throw error;return data||[];
}


export async function clientPremiumData(chatId:number){
  const s=getSupabaseAdmin();
  const today=dayKey();
  const [{data:subscription},{data:preferences},{data:plan},{data:report},{data:proposal},{data:memory},{data:events}]=await Promise.all([
    s.from('subscriptions').select('plan,status,ends_at,created_at').eq('chat_id',chatId).order('created_at',{ascending:false}).limit(1).maybeSingle(),
    s.from('premium_preferences').select('*').eq('chat_id',chatId).maybeSingle(),
    s.from('premium_daily_plans').select('*').eq('chat_id',chatId).eq('for_date',today).maybeSingle(),
    s.from('premium_weekly_reports').select('*').eq('chat_id',chatId).order('week_end',{ascending:false}).limit(1).maybeSingle(),
    s.from('premium_target_proposals').select('*').eq('chat_id',chatId).eq('status','pending').order('created_at',{ascending:false}).limit(1).maybeSingle(),
    s.from('client_food_memory').select('display_name,use_count,avg_grams,last_seen_at').eq('chat_id',chatId).order('use_count',{ascending:false}).limit(12),
    s.from('premium_feature_events').select('feature,created_at').eq('chat_id',chatId).order('created_at',{ascending:false}).limit(12)
  ]);
  return{subscription,preferences,plan,report,proposal,memory:memory||[],events:events||[]};
}

export async function adminPremiumData(){
  const s=getSupabaseAdmin();
  const since=new Date(Date.now()-30*86400000).toISOString();
  const [{data:subs},{data:preferences},{data:plans},{data:reports},{data:events},{data:proposals}]=await Promise.all([
    s.from('subscriptions').select('chat_id,plan,status,price_rub,ends_at,created_at').order('created_at',{ascending:false}).limit(2500),
    s.from('premium_preferences').select('*').limit(2500),
    s.from('premium_daily_plans').select('chat_id,for_date,created_at').gte('created_at',since).limit(5000),
    s.from('premium_weekly_reports').select('chat_id,week_end,created_at').gte('created_at',since).limit(2500),
    s.from('premium_feature_events').select('chat_id,feature,created_at').gte('created_at',since).limit(8000),
    s.from('premium_target_proposals').select('chat_id,status,created_at').gte('created_at',since).limit(2500)
  ]);
  return{subs:subs||[],preferences:preferences||[],plans:plans||[],reports:reports||[],events:events||[],proposals:proposals||[]};
}


export async function premiumIntelligence(chatId:number){
 const s=getSupabaseAdmin();
 const [{data:ctx},{data:recs},{data:checkins},{data:mem}]=await Promise.all([
   s.rpc('nutrition_context',{_chat_id:chatId,_days:14}),
   s.from('premium_recommendations').select('*').eq('chat_id',chatId).order('created_at',{ascending:false}).limit(8),
   s.from('premium_checkins').select('*').eq('chat_id',chatId).order('week_end',{ascending:false}).limit(4),
   s.from('client_memory').select('*').eq('chat_id',chatId).order('confidence',{ascending:false}).limit(20)
 ]);
 return{context:ctx||{},recommendations:recs||[],checkins:checkins||[],clientMemory:mem||[]};
}

export async function premiumHealth(){
 const s=getSupabaseAdmin();
 const {data:subs}=await s.from('subscriptions').select('chat_id,plan,status,ends_at,created_at').order('created_at',{ascending:false}).limit(4000);
 const latest=new Map<number,any>();for(const x of subs||[])if(!latest.has(Number(x.chat_id)))latest.set(Number(x.chat_id),x);
 const ids=[...latest.values()].filter((x:any)=>x.status==='active'&&x.plan==='premium'&&(!x.ends_at||new Date(x.ends_at)>new Date())).map((x:any)=>Number(x.chat_id));
 if(!ids.length)return[];
 const from14=new Date(Date.now()-13*86400000);from14.setHours(0,0,0,0);
 const [{data:profiles},{data:snapshots},{data:checkins},{data:recs},{data:meals}]=await Promise.all([
   s.from('profiles').select('telegram_id,first_name,username,avatar_url,avatar_file_id,avatar_updated_at').in('telegram_id',ids),
   s.from('premium_context_snapshots').select('*').in('chat_id',ids),
   s.from('premium_checkins').select('*').in('chat_id',ids).order('week_end',{ascending:false}).limit(3000),
   s.from('premium_recommendations').select('chat_id,feedback,feedback_reason,created_at').in('chat_id',ids).gte('created_at',new Date(Date.now()-14*86400000).toISOString()).limit(5000),
   s.from('meals').select('chat_id,eaten_at,kcal').in('chat_id',ids).gte('eaten_at',from14.toISOString()).limit(10000)
 ]);
 return ids.map(id=>{const own=(meals||[]).filter((m:any)=>Number(m.chat_id)===id);const days=new Set(own.map((m:any)=>mealDay(m)));const kcalByDay=new Map<string,number>();for(const m of own as any[]){const d=mealDay(m);kcalByDay.set(d,(kcalByDay.get(d)||0)+Number(m.kcal||0))}const vals=[...kcalByDay.values()].filter(v=>v>0);return{chatId:id,profile:(profiles||[]).find((p:any)=>Number(p.telegram_id)===id),snapshot:(snapshots||[]).find((x:any)=>Number(x.chat_id)===id),checkin:(checkins||[]).find((x:any)=>Number(x.chat_id)===id),badFeedback:(recs||[]).filter((x:any)=>Number(x.chat_id)===id&&x.feedback==='not_fit').length,activeDays14:days.size,avgKcalActive:vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):0}});
}


export async function systemHealth(){
 const db=getSupabaseAdmin();
 const since24=new Date(Date.now()-86400000).toISOString(),since7=new Date(Date.now()-7*86400000).toISOString();
 const [{data:events},{data:ai},{data:recognition},{data:jobs},{data:circuits},{count:updates},{count:duplicates},{count:meals}]=await Promise.all([
   db.from('system_events').select('*').gte('created_at',since7).order('created_at',{ascending:false}).limit(150),
   db.from('ai_usage_events').select('*').gte('created_at',since7).order('created_at',{ascending:false}).limit(5000),
   db.from('recognition_events').select('confidence_food,confidence_portion,confidence_nutrition,needs_confirmation,latency_ms,created_at').gte('created_at',since7).limit(5000),
   db.from('processing_jobs').select('status,job_type,attempts,created_at,finished_at').gte('created_at',since7).limit(5000),
   db.from('service_circuit_breakers').select('*').order('updated_at',{ascending:false}),
   db.from('telegram_updates_processed').select('*',{count:'exact',head:true}).gte('processed_at',since24),
   db.from('telegram_update_duplicates').select('*',{count:'exact',head:true}).gte('detected_at',since24),
   db.from('meals').select('*',{count:'exact',head:true}).gte('created_at',since24)
 ]);
 const aiRows=ai||[],rec=recognition||[],js=jobs||[],errs=(events||[]).filter((x:any)=>['error','critical'].includes(x.severity));
 const success=aiRows.filter((x:any)=>x.success!==false).length;
 const lat=aiRows.map((x:any)=>Number(x.latency_ms||0)).filter((x:number)=>x>0).sort((a:number,b:number)=>a-b);
 const avg=(a:number[])=>a.length?Math.round(a.reduce((x,y)=>x+y,0)/a.length):0;
 const recScores=rec.map((x:any)=>(Number(x.confidence_food||0)*.45+Number(x.confidence_portion||0)*.30+Number(x.confidence_nutrition||0)*.25)*100);
 const recLat=rec.map((x:any)=>Number(x.latency_ms||0)).filter((x:number)=>x>0);
 return{events:events||[],circuits:circuits||[],errors24:errs.filter((x:any)=>new Date(x.created_at)>=new Date(since24)).length,updates24:updates||0,duplicates24:duplicates||0,meals24:meals||0,
  ai7:aiRows.length,aiSuccess:aiRows.length?Math.round(success/aiRows.length*100):100,aiAvgMs:avg(lat),aiP95Ms:lat.length?lat[Math.min(lat.length-1,Math.floor(lat.length*.95))]:0,
  recognition7:rec.length,recognitionAvg:recScores.length?Math.round(recScores.reduce((a,b)=>a+b,0)/recScores.length):0,recognitionReview:rec.filter((x:any)=>x.needs_confirmation).length,recognitionAvgMs:avg(recLat),
  jobsQueued:js.filter((x:any)=>x.status==='queued').length,jobsDead:js.filter((x:any)=>x.status==='dead').length};
}

export async function clientOnboardingData(chatId:number){
 const db=getSupabaseAdmin();
 const [{data:onboarding},{data:life},{data:memory}]=await Promise.all([
  db.from('premium_onboarding').select('*').eq('chat_id',chatId).maybeSingle(),
  db.from('subscription_lifecycle').select('*').eq('chat_id',chatId).maybeSingle(),
  db.from('client_memory').select('*').eq('chat_id',chatId).order('confidence',{ascending:false}).limit(20)
 ]);
 return{onboarding,lifecycle:life,memory:memory||[]};
}

export async function knowledgeAdminData(){
 const db=getSupabaseAdmin();
 const [{data:sources},{data:items}]=await Promise.all([
  db.from('coach_sources').select('*').order('created_at',{ascending:false}).limit(200),
  db.from('coach_knowledge').select('*').order('created_at',{ascending:false}).limit(1000)
 ]);
 return{sources:sources||[],items:items||[]};
}

export async function replayAdminData(){
 const db=getSupabaseAdmin();
 const {data}=await db.from('replay_events').select('*').order('created_at',{ascending:false}).limit(100);
 return data||[];
}

export async function subscriptionLifecycleData(chatId:number){
 const db=getSupabaseAdmin();
 const {data}=await db.from('subscription_lifecycle').select('*').eq('chat_id',chatId).maybeSingle();
 return data;
}
