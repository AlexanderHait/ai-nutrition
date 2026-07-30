import {NextResponse} from "next/server";
import {getSupabaseAdmin} from "@/lib/supabase-admin";

const ALLOWED_EVENT_TYPES=new Set(["execution","ai_request","vision_request","web_search"]);
const EVENT_ALIASES:Record<string,string>={
  ai:"ai_request",
  llm:"ai_request",
  openai:"ai_request",
  completion:"ai_request",
  vision:"vision_request",
  image:"vision_request",
  photo:"vision_request",
  search:"web_search",
  internet:"web_search",
  web:"web_search",
  n8n:"execution"
};

function eventType(value:any){
  const raw=String(value||"execution").trim().toLowerCase();
  const normalized=EVENT_ALIASES[raw]||raw;
  return ALLOWED_EVENT_TYPES.has(normalized)?normalized:"execution";
}

function numericOrNull(value:any){
  const n=Number(value);
  return Number.isFinite(n)?n:null;
}

export async function POST(req:Request){
  const secret=process.env.N8N_USAGE_SECRET;
  if(!secret||req.headers.get("authorization")!==`Bearer ${secret}`)
    return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});
  const body=await req.json().catch(()=>null);
  const rows=Array.isArray(body)?body:[body];
  const clean=(rows||[]).filter(Boolean).map((x:any)=>({
    chat_id:Number.isSafeInteger(Number(x.chat_id))?Number(x.chat_id):null,
    workflow_id:x.workflow_id?String(x.workflow_id):null,
    workflow_name:x.workflow_name?String(x.workflow_name):null,
    execution_id:x.execution_id?String(x.execution_id):null,
    event_type:eventType(x.event_type),
    provider:x.provider?String(x.provider):null,
    model:x.model?String(x.model):null,
    subscription_plan:x.subscription_plan?String(x.subscription_plan):null,
    input_tokens:numericOrNull(x.input_tokens),
    output_tokens:numericOrNull(x.output_tokens),
    estimated_cost_rub:numericOrNull(x.estimated_cost_rub),
    metadata:x.metadata&&typeof x.metadata==="object"?x.metadata:{},
    created_at:x.created_at||new Date().toISOString()
  }));
  if(!clean.length)return NextResponse.json({ok:true,inserted:0});
  const s=getSupabaseAdmin();
  let inserted=0,duplicates=0;
  for(const row of clean){
    const {error}=await s.from("ai_usage_events").insert(row);
    if(error){
      if(error.code==="23505"){
        duplicates++;
        continue;
      }
      return NextResponse.json({ok:false,error:error.message},{status:500});
    }
    inserted++;
  }
  return NextResponse.json({ok:true,inserted,duplicates});
}
