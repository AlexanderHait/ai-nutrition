import {NextResponse} from "next/server";
import {getSupabaseAdmin} from "@/lib/supabase-admin";

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
    event_type:String(x.event_type||"execution"),
    provider:x.provider?String(x.provider):null,
    model:x.model?String(x.model):null,
    subscription_plan:x.subscription_plan?String(x.subscription_plan):null,
    input_tokens:Number.isFinite(Number(x.input_tokens))?Number(x.input_tokens):null,
    output_tokens:Number.isFinite(Number(x.output_tokens))?Number(x.output_tokens):null,
    estimated_cost_rub:Number.isFinite(Number(x.estimated_cost_rub))?Number(x.estimated_cost_rub):null,
    metadata:x.metadata&&typeof x.metadata==="object"?x.metadata:{},
    created_at:x.created_at||new Date().toISOString()
  }));
  if(!clean.length)return NextResponse.json({ok:true,inserted:0});
  const s=getSupabaseAdmin();
  const {error}=await s.from("ai_usage_events").upsert(clean,{onConflict:"execution_id,event_type,model,(metadata->>'request_key')",ignoreDuplicates:true});
  if(error){
    // Expression conflict targets are not supported by every PostgREST version; safe fallback.
    const {error:e2}=await s.from("ai_usage_events").insert(clean);
    if(e2)return NextResponse.json({ok:false,error:e2.message},{status:500});
  }
  return NextResponse.json({ok:true,inserted:clean.length});
}
