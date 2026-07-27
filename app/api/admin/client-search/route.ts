import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {getSupabaseAdmin} from "@/lib/supabase-admin";
export const dynamic="force-dynamic";
export async function GET(req:Request){
  await requireAdmin();
  const q=new URL(req.url).searchParams.get("q")?.trim()||"";
  const s=getSupabaseAdmin();
  let query=s.from("profiles").select("telegram_id,first_name,username").order("created_at",{ascending:false}).limit(q?12:7);
  if(q){
    const safe=q.replace(/[%_,()]/g," ").trim();
    if(safe)query=query.or(`first_name.ilike.%${safe}%,username.ilike.%${safe}%`);
  }
  const {data}=await query;
  return NextResponse.json({clients:(data||[]).map((p:any)=>({id:Number(p.telegram_id),name:String(p.first_name||p.username||`Telegram ${p.telegram_id}`),username:p.username?`@${p.username}`:""}))});
}
