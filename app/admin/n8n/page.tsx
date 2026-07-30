import AdminBadge from "@/components/AdminBadge";
import TelegramAvatar from "@/components/TelegramAvatar";
import {adminChatIds,fmt} from "@/lib/data";
import {getSupabaseAdmin} from "@/lib/supabase-admin";
import {Activity,BrainCircuit,Camera,CheckCircle2,Search,Timer,Users,Zap} from "lucide-react";

export const dynamic="force-dynamic";

type Profile={telegram_id:number;first_name?:string|null;username?:string|null;avatar_url?:string|null;avatar_file_id?:string|null;avatar_updated_at?:string|null};
type Usage={chat_id:number|null;event_type:string;estimated_cost_rub:number|null;input_tokens:number|null;output_tokens:number|null;created_at:string};
type BotEvent={chat_id:number;event_type:string;created_at:string};
type Recognition={chat_id:number;confidence_food:number|null;confidence_portion:number|null;confidence_nutrition:number|null;needs_confirmation:boolean|null;latency_ms:number|null;created_at:string};

function confidence(r:Recognition){
  return Math.round((Number(r.confidence_food||0)*.45+Number(r.confidence_portion||0)*.30+Number(r.confidence_nutrition||0)*.25)*100);
}

function avg(values:number[]){
  return values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length):0;
}

function planFor(subs:any[],chatId:number){
  const row=subs.find(x=>Number(x.chat_id)===chatId&&x.status==="active");
  return row?.plan||"basic";
}

export default async function Page(){
  const s=getSupabaseAdmin();
  const fromIso=new Date(Date.now()-30*86400000).toISOString();
  const from7Iso=new Date(Date.now()-7*86400000).toISOString();
  const [adminIds,{data:usage},{data:botEvents},{data:recognition},{data:profiles},{data:subs}]=await Promise.all([
    adminChatIds(),
    s.from("ai_usage_events").select("chat_id,event_type,estimated_cost_rub,input_tokens,output_tokens,created_at").gte("created_at",fromIso).order("created_at",{ascending:false}).limit(20000),
    s.from("bot_events").select("chat_id,event_type,created_at").gte("created_at",fromIso).order("created_at",{ascending:false}).limit(20000),
    s.from("recognition_events").select("chat_id,confidence_food,confidence_portion,confidence_nutrition,needs_confirmation,latency_ms,created_at").gte("created_at",from7Iso).order("created_at",{ascending:false}).limit(8000),
    s.from("profiles").select("telegram_id,first_name,username,avatar_url,avatar_file_id,avatar_updated_at"),
    s.from("subscriptions").select("chat_id,plan,status,created_at").order("created_at",{ascending:false})
  ]);

  const usageRows=(usage||[]) as Usage[];
  const botRows=(botEvents||[]) as BotEvent[];
  const recRows=(recognition||[]) as Recognition[];
  const profileMap=new Map((profiles||[]).map((x:any)=>[Number(x.telegram_id),x as Profile]));

  const usageTotal=usageRows.reduce((a,x)=>({
    exec:a.exec+(x.event_type==="execution"?1:0),
    ai:a.ai+(x.event_type==="ai_request"?1:0),
    vision:a.vision+(x.event_type==="vision_request"?1:0),
    web:a.web+(x.event_type==="web_search"?1:0),
    tokens:a.tokens+Number(x.input_tokens||0)+Number(x.output_tokens||0),
    cost:a.cost+Number(x.estimated_cost_rub||0)
  }),{exec:0,ai:0,vision:0,web:0,tokens:0,cost:0});

  const botByType=new Map<string,number>();
  for(const e of botRows)botByType.set(e.event_type,(botByType.get(e.event_type)||0)+1);
  const saved=botByType.get("meal_saved")||0;
  const edited=botByType.get("meal_edited")||0;
  const photos=botByType.get("photo_analyzed")||0;
  const cacheHits=botByType.get("photo_recognition_cache")||0;
  const recScores=recRows.map(confidence).filter(Number.isFinite);
  const recLat=recRows.map(x=>Number(x.latency_ms||0)).filter(x=>x>0);
  const review=recRows.filter(x=>x.needs_confirmation).length;

  const byClient=new Map<number,{events:number;photos:number;saved:number;edited:number;cache:number;recognitions:number;review:number;avgConfidence:number;avgMs:number;ai:number;vision:number;web:number;cost:number}>();
  for(const e of botRows){
    const id=Number(e.chat_id); if(!id)continue;
    const v=byClient.get(id)||{events:0,photos:0,saved:0,edited:0,cache:0,recognitions:0,review:0,avgConfidence:0,avgMs:0,ai:0,vision:0,web:0,cost:0};
    v.events++;
    if(e.event_type==="photo_analyzed")v.photos++;
    if(e.event_type==="meal_saved")v.saved++;
    if(e.event_type==="meal_edited")v.edited++;
    if(e.event_type==="photo_recognition_cache")v.cache++;
    byClient.set(id,v);
  }
  const recByClient=new Map<number,Recognition[]>();
  for(const r of recRows){
    const id=Number(r.chat_id); if(!id)continue;
    if(!recByClient.has(id))recByClient.set(id,[]);
    recByClient.get(id)!.push(r);
  }
  for(const [id,rows] of recByClient){
    const v=byClient.get(id)||{events:0,photos:0,saved:0,edited:0,cache:0,recognitions:0,review:0,avgConfidence:0,avgMs:0,ai:0,vision:0,web:0,cost:0};
    v.recognitions=rows.length;
    v.review=rows.filter(x=>x.needs_confirmation).length;
    v.avgConfidence=avg(rows.map(confidence));
    v.avgMs=avg(rows.map(x=>Number(x.latency_ms||0)).filter(x=>x>0));
    byClient.set(id,v);
  }
  for(const e of usageRows){
    const id=Number(e.chat_id); if(!id)continue;
    const v=byClient.get(id)||{events:0,photos:0,saved:0,edited:0,cache:0,recognitions:0,review:0,avgConfidence:0,avgMs:0,ai:0,vision:0,web:0,cost:0};
    if(e.event_type==="ai_request")v.ai++;
    if(e.event_type==="vision_request")v.vision++;
    if(e.event_type==="web_search")v.web++;
    v.cost+=Number(e.estimated_cost_rub||0);
    byClient.set(id,v);
  }

  const rows=[...byClient.entries()].sort((a,b)=>b[1].events+b[1].recognitions-a[1].events-a[1].recognitions).slice(0,80);
  const telemetryConnected=usageRows.length>0;

  return <>
    <div className="pageHead">
      <div>
        <p>Инфраструктура</p>
        <h1>n8n / Метрики</h1>
        <span>Реальная активность бота сейчас плюс отдельный слой AI-cost telemetry, когда n8n начнёт его отправлять.</span>
      </div>
    </div>

    <div className="adminKpis">
      <K i={<Activity/>} l="Bot events · 30 дней" v={botRows.length} s={`${saved} сохранений · ${edited} правок`}/>
      <K i={<Camera/>} l="Фото · 30 дней" v={photos} s={`${cacheHits} cache events`}/>
      <K i={<CheckCircle2/>} l="Уверенность · 7 дней" v={`${avg(recScores)}%`} s={`${review}/${recRows.length} требуют проверки`}/>
      <K i={<BrainCircuit/>} l="AI telemetry" v={usageTotal.ai+usageTotal.vision+usageTotal.web} s={telemetryConnected?`${fmt(usageTotal.tokens)} tokens · ${usageTotal.cost.toFixed(2)} ₽`:"ещё не поступает"}/>
    </div>

    {!telemetryConnected&&
      <section className="card top requestsHonestState">
        <Zap/>
        <div>
          <h2>AI-cost telemetry пока не подключена</h2>
          <p>Таблица `ai_usage_events` пустая, поэтому стоимость, токены и web-search не могут считаться честно. Ниже уже показаны реальные production-события из `bot_events` и `recognition_events`; как только n8n начнёт слать `/api/bot/usage`, верхняя AI-строка заполнится без дополнительного polling.</p>
        </div>
      </section>
    }

    <div className="metricGrid top">
      <M icon={<Search/>} k="Web search" v={usageTotal.web} note={telemetryConnected?"из ai_usage_events":"нет входящих telemetry"}/>
      <M icon={<BrainCircuit/>} k="AI requests" v={usageTotal.ai} note={telemetryConnected?"из ai_usage_events":"нет входящих telemetry"}/>
      <M icon={<Camera/>} k="Vision requests" v={usageTotal.vision} note={telemetryConnected?"из ai_usage_events":"нет входящих telemetry"}/>
      <M icon={<Timer/>} k="Recognition avg" v={avg(recLat)?`${avg(recLat)} ms`:"—"} note="по последним 7 дням"/>
    </div>

    <section className="card top tableCard">
      <div className="tableHead n8nGrid"><span>Клиент</span><span>Тариф</span><span>Bot events</span><span>Фото</span><span>Сохранения</span><span>Качество</span><span>AI cost</span></div>
      {rows.map(([id,v])=>{
        const p=profileMap.get(id);
        return <div className="tableRow n8nGrid" key={id}>
          <div className="clientIdentity"><TelegramAvatar profile={p} size="small"/><span><b>{p?.first_name||p?.username||id}{adminIds.has(id)&&<AdminBadge/>}</b><small>{p?.username?`@${p.username}`:`ID ${id}`}</small></span></div>
          <span className={`planPill ${planFor(subs||[],id)}`}>{String(planFor(subs||[],id)).toUpperCase()}</span>
          <span><b>{fmt(v.events)}</b><small>{fmt(v.edited)} правок</small></span>
          <span><b>{fmt(v.photos)}</b><small>{fmt(v.cache)} cache</small></span>
          <span><b>{fmt(v.saved)}</b><small>meal_saved</small></span>
          <span><b>{v.avgConfidence?`${v.avgConfidence}%`:"—"}</b><small>{v.review}/{v.recognitions} проверка</small></span>
          <span><b>{v.cost?v.cost.toFixed(2)+" ₽":"—"}</b><small>{v.ai+v.vision+v.web||0} events</small></span>
        </div>
      })}
      {!rows.length&&<p className="muted" style={{padding:18}}>Событий за период нет.</p>}
    </section>
  </>;
}

function K({i,l,v,s}:{i:React.ReactNode;l:string;v:number|string;s:string}){
  return <div className="adminKpi"><i>{i}</i><div><span>{l}</span><b>{typeof v==="number"?fmt(v):v}</b><small>{s}</small></div></div>;
}

function M({icon,k,v,note}:{icon:React.ReactNode;k:string;v:string|number;note:string}){
  return <div className="metricCard"><i>{icon}</i><span>{k}</span><b>{typeof v==="number"?fmt(v):v}</b><small>{note}</small></div>;
}
