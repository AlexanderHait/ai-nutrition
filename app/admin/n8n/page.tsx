import AdminBadge from "@/components/AdminBadge";
import TelegramAvatar from "@/components/TelegramAvatar";
import {adminChatIds,fmt} from "@/lib/data";
import {getSupabaseAdmin} from "@/lib/supabase-admin";
import {Activity,AlertTriangle,BrainCircuit,Camera,CheckCircle2,Database,Timer,Zap} from "lucide-react";

export const dynamic="force-dynamic";

type Profile={telegram_id:number;first_name?:string|null;username?:string|null;avatar_url?:string|null;avatar_file_id?:string|null;avatar_updated_at?:string|null};
type AiSummary={events:number;executions:number;ai_requests:number;vision_requests:number;web_searches:number;failures:number;tokens:number;cost_usd:number;last_event_at:string|null;with_workflow:number;with_model:number;with_tokens:number;with_cost:number;with_source_event_id:number};
type Latency={samples:number;avg_ms:number|null;p50_ms:number|null;p95_ms:number|null;p99_ms:number|null};
type Breakdown={model?:string;provider?:string;workflow?:string;events:number;failures:number;tokens:number;cost_usd:number;avg_ms:number|null;p95_ms:number|null;last_event_at:string|null};
type ClientMetric={chat_id:number;bot_events:number;photos:number;saved:number;edited:number;cache_hits:number;recognitions:number;review_required:number;avg_confidence:number;confidence_samples:number;zero_confidence:number;recognition_avg_ms:number;ai:number;vision:number;web:number;failures:number;tokens:number;cost_usd:number;ai_avg_ms:number;ai_p95_ms:number;last_event_at:string|null;activity:number};
type Metrics={generated_at:string;period_days:number;recognition_period_days:number;ai:{summary:AiSummary;latency:Latency;models:Breakdown[];workflows:Breakdown[];daily:Array<{day:string;events:number;failures:number;tokens:number;cost_usd:number}>};bot:{events:number;photos:number;saved:number;edited:number;cache_hits:number};recognition:{recognitions:number;review_required:number;avg_confidence:number;confidence_samples:number;zero_confidence:number;avg_ms:number|null;p50_ms:number|null;p95_ms:number|null;p99_ms:number|null};clients:ClientMetric[]};

function planFor(subs:any[],chatId:number){
  const row=subs.find(x=>Number(x.chat_id)===chatId&&x.status==="active");
  return row?.plan||"basic";
}
function usd(value:number){return value?`$${value.toFixed(value<.01?4:2)}`:"—"}
function ms(value:number|null|undefined){return value&&value>0?value>=1000?`${(value/1000).toFixed(1)} с`:`${value} мс`:"—"}
function coverage(value:number,total:number){return total?Math.round(value/total*100):0}
function ago(value:string|null){
  if(!value)return "нет событий";
  const hours=Math.max(0,Math.round((Date.now()-new Date(value).getTime())/3600000));
  if(hours<1)return "меньше часа назад";
  if(hours<24)return `${hours} ч назад`;
  return `${Math.round(hours/24)} дн назад`;
}

export default async function Page(){
  const s=getSupabaseAdmin();
  const [adminIds,metricsResult,profilesResult,subsResult]=await Promise.all([
    adminChatIds(),
    s.rpc("admin_platform_metrics_v2",{_days:30,_recognition_days:7,_client_limit:80}),
    s.from("profiles").select("telegram_id,first_name,username,avatar_url,avatar_file_id,avatar_updated_at"),
    s.from("subscriptions").select("chat_id,plan,status,created_at").order("created_at",{ascending:false})
  ]);

  if(metricsResult.error)console.error("admin platform metrics failed",{code:metricsResult.error.code,message:metricsResult.error.message});
  const metrics=(metricsResult.data||null) as Metrics|null;
  const profiles=(profilesResult.data||[]) as Profile[];
  const subs=subsResult.data||[];
  const profileMap=new Map(profiles.map(x=>[Number(x.telegram_id),x]));

  if(!metrics){
    return <><div className="pageHead"><div><p>Инфраструктура</p><h1>n8n / Метрики</h1></div></div><section className="card top requestsHonestState"><AlertTriangle/><div><h2>Метрики временно недоступны</h2><p>Production-данные не изменены. Ошибка уже записана в журнал Vercel.</p></div></section></>;
  }

  const ai=metrics.ai.summary;
  const telemetryAge=ai.last_event_at?(Date.now()-new Date(ai.last_event_at).getTime())/3600000:Infinity;
  const telemetryLive=ai.events>0&&telemetryAge<24;
  const fieldCoverage=ai.events?Math.round((ai.with_workflow+ai.with_model+ai.with_source_event_id)/(ai.events*3)*100):0;

  return <>
    <div className="pageHead"><div><p>Инфраструктура</p><h1>n8n / AI Analytics</h1><span>Реальные production-метрики без polling: активность, качество, скорость, модели, workflow, ошибки и стоимость.</span></div></div>

    <div className="adminKpis">
      <K i={<Activity/>} l="Bot events · 30 дней" v={metrics.bot.events} s={`${metrics.bot.saved} сохранений · ${metrics.bot.edited} правок`}/>
      <K i={<Camera/>} l="Фото · 30 дней" v={metrics.bot.photos} s={`${metrics.bot.cache_hits} cache events`}/>
      <K i={<CheckCircle2/>} l="Точность · 7 дней" v={`${metrics.recognition.avg_confidence||0}%`} s={`${metrics.recognition.confidence_samples}/${metrics.recognition.recognitions} валидных оценок`}/>
      <K i={<BrainCircuit/>} l="AI telemetry" v={ai.events} s={`${fmt(ai.tokens)} tokens · ${usd(ai.cost_usd)}`}/>
    </div>

    <section className={`card top requestsHonestState ${telemetryLive?"":"warning"}`}>
      {telemetryLive?<Zap/>:<AlertTriangle/>}
      <div><h2>{telemetryLive?"AI telemetry поступает":"AI telemetry не покрывает production"}</h2><p>{telemetryLive?`Последнее событие: ${ago(ai.last_event_at)}. Полнота основных полей: ${fieldCoverage}%.`:`Последнее событие было ${ago(ai.last_event_at)}. В базе только ${ai.events} AI-события, поэтому стоимость и скорость пока не отражают весь production. Контур приёма и агрегации готов; требуется подключение отправки из всех AI-workflow.`}</p></div>
    </section>

    <div className="metricGrid top">
      <M icon={<BrainCircuit/>} k="AI requests" v={ai.ai_requests} note={`${ai.failures} ошибок`}/>
      <M icon={<Camera/>} k="Vision requests" v={ai.vision_requests} note={`${coverage(ai.with_model,ai.events)}% с моделью`}/>
      <M icon={<Database/>} k="Tokens" v={fmt(ai.tokens)} note={`${coverage(ai.with_tokens,ai.events)}% событий с usage`}/>
      <M icon={<Timer/>} k="AI P95" v={ms(metrics.ai.latency.p95_ms)} note={`P50 ${ms(metrics.ai.latency.p50_ms)} · P99 ${ms(metrics.ai.latency.p99_ms)}`}/>
    </div>

    <div className="metricGrid top">
      <M icon={<Timer/>} k="Распознавание P50" v={ms(metrics.recognition.p50_ms)} note={`${metrics.recognition.recognitions} результатов`}/>
      <M icon={<Timer/>} k="Распознавание P95" v={ms(metrics.recognition.p95_ms)} note={`среднее ${ms(metrics.recognition.avg_ms)}`}/>
      <M icon={<AlertTriangle/>} k="Распознавание P99" v={ms(metrics.recognition.p99_ms)} note={`${metrics.recognition.zero_confidence} технических нулей исключены`}/>
      <M icon={<CheckCircle2/>} k="Без проверки" v={`${Math.max(0,metrics.recognition.recognitions-metrics.recognition.review_required)}`} note={`${metrics.recognition.review_required} требуют подтверждения`}/>
    </div>

    <div className="top" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:16}}>
      <BreakdownTable title="По workflow" rows={metrics.ai.workflows} label={x=>x.workflow||"—"}/>
      <BreakdownTable title="По моделям" rows={metrics.ai.models} label={x=>x.model||"—"}/>
    </div>

    <section className="card top tableCard">
      <div className="sectionTitleRow"><div><h2>По клиентам</h2><span className="muted">Bot · распознавание · AI · 30 дней</span></div></div>
      <div className="tableHead n8nGrid"><span>Клиент</span><span>Тариф</span><span>Bot events</span><span>Фото</span><span>Сохранения</span><span>Качество</span><span>AI</span></div>
      {metrics.clients.map(v=>{
        const p=profileMap.get(Number(v.chat_id));
        return <div className="tableRow n8nGrid" key={v.chat_id}>
          <div className="clientIdentity"><TelegramAvatar profile={p} size="small"/><span><b>{p?.first_name||p?.username||v.chat_id}{adminIds.has(Number(v.chat_id))&&<AdminBadge/>}</b><small>{p?.username?`@${p.username}`:`ID ${v.chat_id}`}</small></span></div>
          <span className={`planPill ${planFor(subs,Number(v.chat_id))}`}>{String(planFor(subs,Number(v.chat_id))).toUpperCase()}</span>
          <span><b>{fmt(v.bot_events)}</b><small>{fmt(v.edited)} правок</small></span>
          <span><b>{fmt(v.photos)}</b><small>{fmt(v.cache_hits)} cache</small></span>
          <span><b>{fmt(v.saved)}</b><small>{v.recognitions} recognitions</small></span>
          <span><b>{v.avg_confidence?`${v.avg_confidence}%`:"—"}</b><small>{v.confidence_samples}/{v.recognitions} валидно</small></span>
          <span><b>{v.ai+v.vision+v.web}</b><small>{usd(v.cost_usd)} · {v.failures} ошибок</small></span>
        </div>;
      })}
      {!metrics.clients.length&&<p className="muted" style={{padding:18}}>Событий за период нет.</p>}
    </section>
  </>;
}

function BreakdownTable({title,rows,label}:{title:string;rows:Breakdown[];label:(row:Breakdown)=>string}){
  return <section className="card tableCard"><div className="sectionTitleRow"><div><h2>{title}</h2><span className="muted">30 дней</span></div></div><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:520}}><thead><tr><th align="left">Название</th><th>Запросы</th><th>Ошибки</th><th>P95</th><th>Токены</th><th>Стоимость</th></tr></thead><tbody>{rows.map((row,index)=><tr key={`${label(row)}-${index}`}><td><b>{label(row)}</b>{row.provider&&<small style={{display:"block",opacity:.55}}>{row.provider}</small>}</td><td align="center">{fmt(row.events)}</td><td align="center">{fmt(row.failures)}</td><td align="center">{ms(row.p95_ms)}</td><td align="center">{fmt(row.tokens)}</td><td align="center">{usd(row.cost_usd)}</td></tr>)}</tbody></table>{!rows.length&&<p className="muted" style={{padding:18}}>Данных пока нет.</p>}</div></section>;
}
function K({i,l,v,s}:{i:React.ReactNode;l:string;v:number|string;s:string}){return <div className="adminKpi"><i>{i}</i><div><span>{l}</span><b>{typeof v==="number"?fmt(v):v}</b><small>{s}</small></div></div>}
function M({icon,k,v,note}:{icon:React.ReactNode;k:string;v:string|number;note:string}){return <div className="metricCard"><i>{icon}</i><span>{k}</span><b>{typeof v==="number"?fmt(v):v}</b><small>{note}</small></div>}
