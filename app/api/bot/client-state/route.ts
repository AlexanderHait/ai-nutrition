import {NextResponse} from "next/server";
import {clientData,dayKey,mealSessions,sumMeals} from "@/lib/data";
export const dynamic='force-dynamic';
export async function GET(req:Request){
  if(req.headers.get('authorization')!==`Bearer ${process.env.BOT_INGEST_SECRET}`)return NextResponse.json({error:'unauthorized'},{status:401});
  const chatId=Number(new URL(req.url).searchParams.get('chat_id'));
  if(!Number.isSafeInteger(chatId)||chatId<=0)return NextResponse.json({error:'bad chat_id'},{status:400});
  const d=await clientData(chatId); if(!d.profile)return NextResponse.json({error:'not found'},{status:404});
  const today=dayKey();
  const todayMeals=d.meals.filter(m=>m.eaten_day===today);
  const todayTotal=sumMeals(todayMeals); const todaySessions=mealSessions(todayMeals);
  const recentDays=Array.from({length:7},(_,i)=>{const date=new Date();date.setDate(date.getDate()-(6-i));const day=dayKey(date);const meals=d.meals.filter(m=>m.eaten_day===day);return{day,total:sumMeals(meals),sessions:mealSessions(meals)}});
  const st:any=d.settings||{};
  return NextResponse.json({
    day:today,
    profile:{telegram_id:d.profile.telegram_id,first_name:d.profile.first_name,username:d.profile.username,avatar_url:(d.profile as any).avatar_url||null},
    settings:{goal:st.goal||null,kcal_target:Number(st.kcal_target||0),protein_target:Number(st.protein_target_g||st.prot_target||0),fat_target:Number(st.fat_target_g||0),carb_target:Number(st.carb_target_g||0),current_weight_kg:Number(st.current_weight_kg||d.weights?.[0]?.weight_kg||0),target_weight_kg:Number(st.target_weight_kg||0),height_cm:Number(st.height_cm||0),activity_level:st.activity_level||null},
    today:{total:todayTotal,meal_count:todaySessions.length,sessions:todaySessions.map(s=>({time:s.time,total:s.total,items:s.meals.map(m=>m.dish)}))},
    week:{days:recentDays.map(x=>({day:x.day,total:x.total,meal_count:x.sessions.length})),avg_kcal_7:Math.round(recentDays.reduce((a,x)=>a+x.total.kcal,0)/7),active_days:recentDays.filter(x=>x.sessions.length>0).length,meal_count:recentDays.reduce((a,x)=>a+x.sessions.length,0)},
    subscription:d.subscription||null
  },{headers:{'Cache-Control':'no-store'}});
}
