import { getSupabaseAdmin } from './supabase-admin';

export type Meal={
  id:number;chat_id:number;dish:string;grams:number;kcal:number;prot:number;fat:number;carb:number;
  eaten_at:string;eaten_day:string;deleted:boolean
};
export type Profile={id:number;telegram_id:number;first_name:string|null;username:string|null;locale:string|null;created_at:string};

export async function allData(){
  const s=getSupabaseAdmin();
  const [{data:profiles,error:pe},{data:meals,error:me},{data:logs,error:le},{data:digests,error:de}]=await Promise.all([
    s.from('profiles').select('*').order('created_at',{ascending:false}),
    s.from('meals').select('*').eq('deleted',false).order('eaten_at',{ascending:false}),
    s.from('chat_logs').select('*').order('created_at',{ascending:false}).limit(3000),
    s.from('digests').select('*').order('for_date',{ascending:false}).limit(2000)
  ]);
  if(pe)throw pe;if(me)throw me;
  return{profiles:(profiles||[]) as Profile[],meals:(meals||[]) as Meal[],logs:le?[]:(logs||[]),digests:de?[]:(digests||[])};
}

export async function clientData(chatId:number){
  const s=getSupabaseAdmin();
  const [
    {data:profile},{data:meals},{data:logs},{data:digests},{data:settings},{data:weights},{data:sub},
    {data:events},{data:support}
  ]=await Promise.all([
    s.from('profiles').select('*').eq('telegram_id',chatId).maybeSingle(),
    s.from('meals').select('*').eq('chat_id',chatId).eq('deleted',false).order('eaten_at',{ascending:false}).limit(500),
    s.from('chat_logs').select('*').eq('chat_id',chatId).order('created_at',{ascending:false}).limit(300),
    s.from('digests').select('*').eq('chat_id',chatId).order('for_date',{ascending:false}).limit(90),
    s.from('client_settings').select('*').eq('chat_id',chatId).maybeSingle(),
    s.from('weight_logs').select('*').eq('chat_id',chatId).order('measured_at',{ascending:false}).limit(100),
    s.from('subscriptions').select('*').eq('chat_id',chatId).order('created_at',{ascending:false}).limit(1).maybeSingle(),
    s.from('bot_events').select('*').eq('chat_id',chatId).order('created_at',{ascending:false}).limit(60),
    s.from('support_messages').select('*').eq('chat_id',chatId).order('created_at',{ascending:true}).limit(500)
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
  }).sort((a,b)=>new Date(b.latest.created_at).getTime()-new Date(a.latest.created_at).getTime());
}

export async function supportMessages(chatId:number){
  const s=getSupabaseAdmin();
  const {data,error}=await s.from('support_messages').select('*').eq('chat_id',chatId).order('created_at',{ascending:true}).limit(500);
  if(error)throw error;
  return data||[];
}

export const n=(v:any)=>Number(v||0);
export const fmt=(v:any,d=0)=>n(v).toLocaleString('ru-RU',{maximumFractionDigits:d});
export function dayKey(d=new Date()){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Moscow'}).format(d)}
export function sumMeals(rows:Meal[]){return rows.reduce((a,m)=>({kcal:a.kcal+n(m.kcal),prot:a.prot+n(m.prot),fat:a.fat+n(m.fat),carb:a.carb+n(m.carb)}),{kcal:0,prot:0,fat:0,carb:0})}
