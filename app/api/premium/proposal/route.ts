import {NextResponse} from "next/server";
import {session} from "@/lib/auth";
import {getSupabaseAdmin} from "@/lib/supabase-admin";
export async function POST(req:Request){
 const a=await session();if(!a?.chatId)return NextResponse.redirect(new URL("/login",req.url));
 const f=await req.formData(),id=Number(f.get("id")),action=String(f.get("action"));
 const s=getSupabaseAdmin();
 const {data:p}=await s.from("premium_target_proposals").select("*").eq("id",id).eq("chat_id",Number(a.chatId)).eq("status","pending").maybeSingle();
 if(!p)return NextResponse.redirect(new URL("/client/coach",req.url));
 if(action==="apply"){
   const update:any={updated_at:new Date().toISOString()};
   if(p.proposed_kcal)update.kcal_target=p.proposed_kcal;
   if(p.proposed_protein)update.protein_target=p.proposed_protein;
   if(p.proposed_fat)update.fat_target=p.proposed_fat;
   if(p.proposed_carb)update.carb_target=p.proposed_carb;
   await s.from("client_settings").update(update).eq("chat_id",Number(a.chatId));
   await s.from("premium_target_proposals").update({status:"applied",resolved_at:new Date().toISOString()}).eq("id",id);
 }else await s.from("premium_target_proposals").update({status:"dismissed",resolved_at:new Date().toISOString()}).eq("id",id);
 return NextResponse.redirect(new URL("/client/coach",req.url));
}