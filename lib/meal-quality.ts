import type { Meal } from "@/lib/data";

export type MealQuality = {
  ok: boolean;
  level: "ok" | "check" | "bad";
  reasons: string[];
  kcalFromMacros: number;
  macroDeltaPct: number;
  kcalPer100: number;
};

export function mealQuality(meal: Pick<Meal,"dish"|"grams"|"kcal"|"prot"|"fat"|"carb">): MealQuality {
  const grams=Number(meal.grams||0);
  const kcal=Number(meal.kcal||0);
  const prot=Number(meal.prot||0);
  const fat=Number(meal.fat||0);
  const carb=Number(meal.carb||0);
  const reasons:string[]=[];

  if(!Number.isFinite(grams)||grams<=0) reasons.push("Не указана масса");
  if(!Number.isFinite(kcal)||kcal<=0) reasons.push("Не определены калории");
  if([prot,fat,carb].some(v=>!Number.isFinite(v)||v<0)) reasons.push("Некорректные БЖУ");

  const kcalFromMacros=Math.max(0,prot*4+fat*9+carb*4);
  const macroDeltaPct=kcal>0&&kcalFromMacros>0?Math.abs(kcal-kcalFromMacros)/kcal*100:0;
  if(kcal>0&&kcalFromMacros>0&&macroDeltaPct>28) reasons.push("Калории заметно расходятся с БЖУ");

  const per100=grams>0?kcal/grams*100:0;
  const s=String(meal.dish||"").toLowerCase();
  let min=5,max=900;
  if(/суп|борщ|щи|бульон/.test(s)){min=8;max=260}
  else if(/салат|овощ/.test(s)){min=8;max=450}
  else if(/рис|греч|макарон|картоф|пюре|круп/.test(s)){min=35;max=430}
  else if(/кур|индей|рыб|мяс|филе|котлет|бургер|кордон/.test(s)){min=55;max=680}
  else if(/хлеб|булоч|выпеч|лаваш|батончик/.test(s)){min=100;max=720}
  else if(/соус|майон|сметан|заправ/.test(s)){min=15;max=900}
  if(per100>0&&(per100<min||per100>max)) reasons.push("Необычная калорийность на 100 г");

  const severe=!Number.isFinite(grams)||grams<=0||!Number.isFinite(kcal)||kcal<=0||per100>1200;
  const level:MealQuality["level"]=severe?"bad":reasons.length?"check":"ok";
  return {ok:level==="ok",level,reasons,kcalFromMacros,macroDeltaPct,kcalPer100:Math.round(per100)};
}

export function sessionQuality(meals: Meal[]){
  const results=meals.map(mealQuality);
  return {
    bad:results.filter(x=>x.level==="bad").length,
    check:results.filter(x=>x.level==="check").length,
    ok:results.every(x=>x.level==="ok"),
  };
}
