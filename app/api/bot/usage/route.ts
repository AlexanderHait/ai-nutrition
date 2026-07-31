import {createHmac,timingSafeEqual} from "crypto";
import {NextResponse} from "next/server";
import {getSupabaseAdmin} from "@/lib/supabase-admin";

const MAX_BATCH_SIZE=500;
const SIGNATURE_TTL_MS=5*60*1000;
const ALLOWED_REQUEST_TYPES=new Set(["execution","ai_request","vision_request","web_search"]);
const REQUEST_TYPE_ALIASES:Record<string,string>={
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

type AuthMode="bearer"|"signed";

function requestType(value:unknown){
  const raw=String(value||"execution").trim().toLowerCase();
  const normalized=REQUEST_TYPE_ALIASES[raw]||raw;
  return ALLOWED_REQUEST_TYPES.has(normalized)?normalized:"execution";
}

function textOrNull(value:unknown){
  if(value===null||value===undefined)return null;
  const text=String(value).trim();
  return text||null;
}

function numberOrNull(value:unknown){
  if(value===null||value===undefined||value==="")return null;
  const number=Number(value);
  return Number.isFinite(number)&&number>=0?number:null;
}

function integerOrNull(value:unknown){
  const number=numberOrNull(value);
  return number===null?null:Math.trunc(number);
}

function booleanValue(value:unknown){
  if(value===false||value==="false"||value===0||value==="0")return false;
  return true;
}

function safeChatId(value:unknown){
  const number=Number(value);
  return Number.isSafeInteger(number)&&number>0?number:null;
}

function safeTimestamp(value:unknown){
  if(!value)return new Date().toISOString();
  const parsed=new Date(String(value));
  return Number.isNaN(parsed.getTime())?new Date().toISOString():parsed.toISOString();
}

function objectMetadata(value:unknown){
  return value&&typeof value==="object"&&!Array.isArray(value)?{...(value as Record<string,unknown>)}:{};
}

function safeHexEqual(actual:string,expected:string){
  if(!/^[a-f0-9]{64}$/i.test(actual)||actual.length!==expected.length)return false;
  return timingSafeEqual(Buffer.from(actual,"hex"),Buffer.from(expected,"hex"));
}

function authorize(req:Request,rawBody:string):AuthMode|null{
  const authorization=req.headers.get("authorization");
  const usageSecret=process.env.N8N_USAGE_SECRET;
  if(usageSecret&&authorization===`Bearer ${usageSecret}`)return "bearer";

  const signingSecret=process.env.BOT_INGEST_SECRET;
  const timestamp=req.headers.get("x-teddy-timestamp");
  const signature=req.headers.get("x-teddy-signature");
  if(!signingSecret||!timestamp||!signature)return null;

  const timestampMs=Number(timestamp);
  if(!Number.isFinite(timestampMs)||Math.abs(Date.now()-timestampMs)>SIGNATURE_TTL_MS)return null;

  const expected=createHmac("sha256",signingSecret).update(`${timestamp}.${rawBody}`).digest("hex");
  return safeHexEqual(signature,expected)?"signed":null;
}

export async function POST(req:Request){
  const rawBody=await req.text().catch(()=>"");
  const authMode=authorize(req,rawBody);
  if(!authMode){
    return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});
  }

  let body:unknown=null;
  try{
    body=JSON.parse(rawBody);
  }catch{
    return NextResponse.json({ok:false,error:"Invalid JSON"},{status:400});
  }

  const sourceRows=Array.isArray(body)?body:[body];
  if(sourceRows.length>MAX_BATCH_SIZE){
    return NextResponse.json({ok:false,error:`Batch limit is ${MAX_BATCH_SIZE}`},{status:413});
  }

  const clean=sourceRows
    .filter((row):row is Record<string,unknown>=>Boolean(row&&typeof row==="object"&&!Array.isArray(row)))
    .map(row=>{
      const normalizedRequestType=requestType(row.request_type||row.event_type);
      const metadata=objectMetadata(row.metadata);
      const legacyFields:Record<string,unknown>={
        workflow_id:textOrNull(row.workflow_id),
        workflow_name:textOrNull(row.workflow_name),
        execution_id:textOrNull(row.execution_id),
        subscription_plan:textOrNull(row.subscription_plan),
        image_count:integerOrNull(row.image_count),
        estimated_cost_rub:numberOrNull(row.estimated_cost_rub)
      };
      for(const [key,value] of Object.entries(legacyFields)){
        if(value!==null&&metadata[key]===undefined)metadata[key]=value;
      }

      return {
        source_event_id:textOrNull(row.source_event_id||row.event_id||row.idempotency_key),
        chat_id:safeChatId(row.chat_id),
        feature:textOrNull(row.feature)||normalizedRequestType,
        request_type:normalizedRequestType,
        provider:textOrNull(row.provider),
        model:textOrNull(row.model),
        workflow:textOrNull(row.workflow||row.workflow_name||row.workflow_id),
        success:booleanValue(row.success),
        latency_ms:integerOrNull(row.latency_ms),
        input_tokens:integerOrNull(row.input_tokens),
        output_tokens:integerOrNull(row.output_tokens),
        estimated_input_tokens:integerOrNull(row.estimated_input_tokens),
        estimated_output_tokens:integerOrNull(row.estimated_output_tokens),
        cost_usd:numberOrNull(row.cost_usd??row.estimated_cost_usd),
        error_code:textOrNull(row.error_code),
        metadata,
        created_at:safeTimestamp(row.created_at)
      };
    });

  if(!clean.length){
    return NextResponse.json({ok:true,inserted:0,duplicates:0});
  }

  if(authMode==="signed"&&clean.some(row=>!row.source_event_id)){
    return NextResponse.json({ok:false,error:"source_event_id is required for signed telemetry"},{status:400});
  }

  const s=getSupabaseAdmin();
  let inserted=0;
  let duplicates=0;

  for(const row of clean){
    const {error}=await s.from("ai_usage_events").insert(row);
    if(error){
      if(error.code==="23505"&&row.source_event_id){
        duplicates++;
        continue;
      }
      console.error("usage telemetry insert failed",{code:error.code,message:error.message,feature:row.feature,workflow:row.workflow});
      return NextResponse.json({ok:false,error:"Telemetry insert failed",code:error.code},{status:500});
    }
    inserted++;
  }

  return NextResponse.json({ok:true,inserted,duplicates});
}
