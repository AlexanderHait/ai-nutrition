import {NextResponse} from "next/server";
import {session} from "@/lib/auth";
import {getSupabaseAdmin} from "@/lib/supabase-admin";
export async function POST(req:Request){
  const a=await session(); if(!a?.chatId)return NextResponse.redirect(new URL("/login",req.url));
  const f=await req.formData();
  const level=String(f.get("notification_level")||"normal");
  const allowed=["minimal","normal","active"];
  const row={
    chat_id:Number(a.chatId),
    notification_level:allowed.includes(level)?level:"normal",
    morning_plan:f.get("morning_plan")==="on",
    smart_nudges:f.get("smart_nudges")==="on",
    weekly_review:f.get("weekly_review")==="on",
    post_meal_insights:f.get("post_meal_insights")==="on",
    updated_at:new Date().toISOString()
  };
  const {error}=await getSupabaseAdmin().from("premium_preferences").upsert(row,{onConflict:"chat_id"});
  const u=new URL("/client/coach",req.url);u.searchParams.set("saved",error?"0":"1");
  return NextResponse.redirect(u);
}