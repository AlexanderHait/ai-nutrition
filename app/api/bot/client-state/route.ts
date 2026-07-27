import {NextResponse} from "next/server";
import {getSupabaseAdmin} from "@/lib/supabase-admin";
import {dayKey,mealSessions,sumMeals,type Meal} from "@/lib/data";
export const dynamic="force-dynamic";
export async function GET(req:Request){
 if(req.headers.get("authorization")!==`Bearer ${process.env.BOT_INGEST_SECRET}`)return NextResponse.json({error:"unauthorized"},{status:401});
 const chatId=Number(new URL(req.url).searchParams.get("chat_id"));if(!Number.isSafeInteger(chatId)||chatId<=0)return NextResponse.json({error:"bad chat_id"},{status:400});
 const s=getSupabaseAdmin(),d7=new Date();d7.setDate(d7.getDate()-6);const fromDay=dayKey(d7),today=dayKey();
 const [{data:profile},{data:settings},{data:meals},{data:weight},{data:subscription}]=await Promise.all([
  s.from("profiles").select("telegram_id,first_name,username,avatar_url").eq("telegram_id",chatId).maybeSingle(),
  s.from("client_settings").select("*").eq("chat_id",chatId).maybeSingle(),
  s.from("meals").select("id,chat_id,dish,grams,kcal,prot,fat,carb,eaten_at,eaten_day,deleted").eq("chat_id",chatId).eq("deleted",false).gte("eaten_day",fromDay).order("eaten_at",{ascending:false}).limit(500),
  s.from("weight_logs").select("weight_kg,measured_at").eq("chat_id",chatId).order("measured_at",{ascending:false}).limit(1).maybeSingle(),
  s.from("subscriptions").select("plan,status,price_rub,started_at,ends_at,created_at").eq("chat_id",chatId).order("created_at",{ascending:false}).limit(1).maybeSingle()
 ]);
 if(!profile)return NextResponse.json({error:"not found"},{status:404});const rows=(meals||[]) as Meal[],byDay=new Map<string,Meal[]>();for(const m of rows){const k=String(m.eaten_day).slice(0,10);if(!byDay.has(k))byDay.set(k,[]);byDay.get(k)!.push(m)}const tm=byDay.get(today)||[],ts=mealSessions(tm),recent=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(6-i));const day=dayKey(d),r=byDay.get(day)||[];return{day,total:sumMeals(r),sessions:mealSessions(r)}}),st:any=settings||{};
 return NextResponse.json({day:today,profile,settings:{goal:st.goal||null,kcal_target:Number(st.kcal_target||0),protein_target:Number(st.protein_target||st.protein_target_g||st.prot_target||0),fat_target:Number(st.fat_target||st.fat_target_g||0),carb_target:Number(st.carb_target||st.carb_target_g||0),current_weight_kg:Number(st.current_weight_kg||weight?.weight_kg||0),target_weight_kg:Number(st.target_weight_kg||0),height_cm:Number(st.height_cm||0),activity_level:st.activity_level||null},today:{total:sumMeals(tm),meal_count:ts.length,sessions:ts.map(x=>({time:x.time,total:x.total,items:x.meals.map(m=>m.dish)}))},week:{days:recent.map(x=>({day:x.day,total:x.total,meal_count:x.sessions.length})),avg_kcal_7:Math.round(recent.reduce((a,x)=>a+x.total.kcal,0)/7),active_days:recent.filter(x=>x.sessions.length>0).length,meal_count:recent.reduce((a,x)=>a+x.sessions.length,0)},subscription:subscription||null},{headers:{"Cache-Control":"no-store"}});
}
