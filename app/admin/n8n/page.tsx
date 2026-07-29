import {getSupabaseAdmin} from "@/lib/supabase-admin";
import {adminChatIds} from "@/lib/data";
import AdminBadge from "@/components/AdminBadge";
import {Activity,BrainCircuit,Camera,Users} from "lucide-react";
export const dynamic="force-dynamic";

export default async function Page(){
  const s=getSupabaseAdmin(),adminIds=await adminChatIds(),from=new Date(Date.now()-30*86400000).toISOString();
  const [{data:events},{data:profiles},{data:subs}]=await Promise.all([
    s.from("ai_usage_events").select("*").gte("created_at",from).order("created_at",{ascending:false}).limit(20000),
    s.from("profiles").select("telegram_id,first_name,username"),
    s.from("subscriptions").select("chat_id,plan,status,created_at").order("created_at",{ascending:false})
  ]);
  const latest=new Map<number,string>(); for(const x of subs||[])if(!latest.has(Number(x.chat_id))&&x.status==="active")latest.set(Number(x.chat_id),x.plan);
  const pm=new Map((profiles||[]).map((x:any)=>[Number(x.telegram_id),x]));
  const by=new Map<number,{exec:number;ai:number;vision:number;web:number;cost:number}>();
  for(const e of events||[]){const id=Number(e.chat_id);if(!id)continue;const v=by.get(id)||{exec:0,ai:0,vision:0,web:0,cost:0};if(e.event_type==="execution")v.exec++;if(e.event_type==="ai_request")v.ai++;if(e.event_type==="vision_request")v.vision++;if(e.event_type==="web_search")v.web++;v.cost+=Number(e.estimated_cost_rub||0);by.set(id,v)}
  const rows=[...by.entries()].sort((a,b)=>(b[1].ai+b[1].vision)-(a[1].ai+a[1].vision));
  const total=[...by.values()].reduce((a,v)=>({exec:a.exec+v.exec,ai:a.ai+v.ai,vision:a.vision+v.vision,web:a.web+v.web,cost:a.cost+v.cost}),{exec:0,ai:0,vision:0,web:0,cost:0});
  return <><div className="pageHead"><div><p>Инфраструктура</p><h1>n8n / AI usage</h1><span>Использование за последние 30 дней по каждому клиенту и тарифу.</span></div></div>
  <div className="adminKpis"><K i={<Activity/>} l="Executions" v={total.exec}/><K i={<BrainCircuit/>} l="AI-запросы" v={total.ai}/><K i={<Camera/>} l="Vision" v={total.vision}/><K i={<Users/>} l="Клиентов" v={rows.length}/></div>
  <section className="card top"><div className="sectionTitleRow"><div><h2>По клиентам</h2><span className="muted">Basic / Premium · 30 дней</span></div></div>
  {!rows.length?<p className="muted">Телеметрия появится после подключения n8n к /api/bot/usage. Таблица уже готова.</p>:
  <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><th align="left">Клиент</th><th>Тариф</th><th>Executions</th><th>AI</th><th>Vision</th><th>Web</th><th>Стоимость*</th></tr></thead><tbody>{rows.map(([id,v])=>{const p:any=pm.get(id);return <tr key={id}><td>{p?.first_name||p?.username||id}{adminIds.has(id)&&<AdminBadge/>}<small style={{display:"block",opacity:.55}}>{p?.username?`@${p.username}`:`ID ${id}`}</small></td><td align="center">{String(latest.get(id)||"basic").toUpperCase()}</td><td align="center">{v.exec}</td><td align="center">{v.ai}</td><td align="center">{v.vision}</td><td align="center">{v.web}</td><td align="center">{v.cost?v.cost.toFixed(2)+" ₽":"—"}</td></tr>})}</tbody></table></div>}
  <p className="muted" style={{marginTop:14}}>* Стоимость отображается, когда n8n передаёт рассчитанную стоимость запроса.</p></section></>
}
function K({i,l,v}:{i:React.ReactNode;l:string;v:number}){return <div className="adminKpi"><i>{i}</i><div><span>{l}</span><b>{v.toLocaleString("ru-RU")}</b><small>за 30 дней</small></div></div>}
