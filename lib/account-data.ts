import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { dayKey, mealDay, sumMeals, type Meal } from "@/lib/data";

export async function clientHomeAccountData(accountId: string) {
  const db = getSupabaseAdmin();
  const date = new Date();
  date.setDate(date.getDate() - 6);
  const fromDay = dayKey(date);
  const [
    { data: profile },
    { data: settings },
    { data: subscription },
    { data: meals },
    { data: digests },
    { data: weights },
  ] = await Promise.all([
    db.from("profiles").select("id,account_id,telegram_id,first_name,username,avatar_url,avatar_file_id,avatar_updated_at").eq("account_id", accountId).maybeSingle(),
    db.from("client_settings").select("*").eq("account_id", accountId).maybeSingle(),
    db.from("subscriptions").select("plan,status,ends_at,created_at").eq("account_id", accountId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("meals").select("id,chat_id,dish,grams,kcal,prot,fat,carb,eaten_at,eaten_day,deleted").eq("account_id", accountId).eq("deleted", false).gte("eaten_day", fromDay).order("eaten_at", { ascending: false }).limit(400),
    db.from("digests").select("id,for_date,kcal,summary_md").eq("account_id", accountId).order("for_date", { ascending: false }).limit(1),
    db.from("weight_logs").select("id,weight_kg,measured_at").eq("account_id", accountId).order("measured_at", { ascending: false }).limit(1),
  ]);
  return { profile, settings, subscription, meals: (meals || []) as Meal[], digests: digests || [], weights: weights || [] };
}

export async function clientProfileAccountData(accountId: string) {
  const db = getSupabaseAdmin();
  const [{ data: profile }, { data: settings }, { data: subscription }, { data: weights }, { data: account }] = await Promise.all([
    db.from("profiles").select("id,account_id,telegram_id,first_name,username,avatar_url,avatar_file_id,avatar_updated_at").eq("account_id", accountId).maybeSingle(),
    db.from("client_settings").select("*").eq("account_id", accountId).maybeSingle(),
    db.from("subscriptions").select("plan,status,price_rub,ends_at,created_at").eq("account_id", accountId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("weight_logs").select("id,weight_kg,measured_at").eq("account_id", accountId).order("measured_at", { ascending: false }).limit(8),
    db.from("customer_accounts").select("email,login,telegram_id").eq("id", accountId).maybeSingle(),
  ]);
  return { profile, settings, subscription, weights: weights || [], account };
}

export async function clientProgressAccountData(accountId: string) {
  const db = getSupabaseAdmin();
  const date = new Date();
  date.setDate(date.getDate() - 13);
  const fromDay = dayKey(date);
  const [{ data: settings }, { data: meals }, { data: weights }, { data: digests }, { data: subscription }] = await Promise.all([
    db.from("client_settings").select("*").eq("account_id", accountId).maybeSingle(),
    db.from("meals").select("id,chat_id,dish,grams,kcal,prot,fat,carb,eaten_at,eaten_day,deleted").eq("account_id", accountId).eq("deleted", false).gte("eaten_day", fromDay).order("eaten_at", { ascending: false }).limit(800),
    db.from("weight_logs").select("id,weight_kg,measured_at").eq("account_id", accountId).order("measured_at", { ascending: false }).limit(10),
    db.from("digests").select("id,for_date,kcal,summary_md").eq("account_id", accountId).order("for_date", { ascending: false }).limit(8),
    db.from("subscriptions").select("plan,status,ends_at,created_at").eq("account_id", accountId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  return { settings, meals: (meals || []) as Meal[], weights: weights || [], digests: digests || [], subscription };
}

export async function clientNutritionAccountData(accountId: string, days = 45) {
  const db = getSupabaseAdmin();
  const date = new Date();
  date.setDate(date.getDate() - (days - 1));
  const fromDay = dayKey(date);
  const { data, error } = await db.from("meals")
    .select("id,chat_id,dish,grams,kcal,prot,fat,carb,eaten_at,eaten_day,deleted")
    .eq("account_id", accountId)
    .eq("deleted", false)
    .gte("eaten_day", fromDay)
    .order("eaten_at", { ascending: false })
    .limit(1800);
  if (error) throw error;
  return (data || []) as Meal[];
}

export async function clientSupportAccountData(accountId: string) {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("support_messages").select("*").eq("account_id", accountId).order("created_at", { ascending: true }).limit(250);
  if (error) throw error;
  return data || [];
}

export async function clientPremiumAccountData(accountId: string) {
  const db = getSupabaseAdmin();
  const today = dayKey();
  const [{ data: subscription }, { data: preferences }, { data: plan }, { data: report }, { data: proposal }, { data: memory }, { data: events }] = await Promise.all([
    db.from("subscriptions").select("plan,status,ends_at,created_at").eq("account_id", accountId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("premium_preferences").select("*").eq("account_id", accountId).maybeSingle(),
    db.from("premium_daily_plans").select("*").eq("account_id", accountId).eq("for_date", today).maybeSingle(),
    db.from("premium_weekly_reports").select("*").eq("account_id", accountId).order("week_end", { ascending: false }).limit(1).maybeSingle(),
    db.from("premium_target_proposals").select("*").eq("account_id", accountId).eq("status", "pending").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("client_food_memory").select("display_name,use_count,avg_grams,last_seen_at").eq("account_id", accountId).order("use_count", { ascending: false }).limit(12),
    db.from("premium_feature_events").select("feature,created_at").eq("account_id", accountId).order("created_at", { ascending: false }).limit(12),
  ]);
  return { subscription, preferences, plan, report, proposal, memory: memory || [], events: events || [] };
}

export async function premiumIntelligenceAccountData(accountId: string) {
  const db = getSupabaseAdmin();
  const today = dayKey();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 13);
  const fromDay = dayKey(fromDate);
  const sevenDate = new Date();
  sevenDate.setDate(sevenDate.getDate() - 6);
  const sevenDay = dayKey(sevenDate);

  const [
    { data: settings },
    { data: meals },
    { data: weights },
    { data: recommendations },
    { data: checkins },
    { data: memory },
  ] = await Promise.all([
    db.from("client_settings").select("*").eq("account_id", accountId).maybeSingle(),
    db.from("meals").select("id,chat_id,dish,grams,kcal,prot,fat,carb,eaten_at,eaten_day,deleted").eq("account_id", accountId).eq("deleted", false).gte("eaten_day", fromDay).order("eaten_at", { ascending: false }).limit(1200),
    db.from("weight_logs").select("id,weight_kg,measured_at").eq("account_id", accountId).order("measured_at", { ascending: false }).limit(12),
    db.from("premium_recommendations").select("*").eq("account_id", accountId).order("created_at", { ascending: false }).limit(8),
    db.from("premium_checkins").select("*").eq("account_id", accountId).order("week_end", { ascending: false }).limit(4),
    db.from("client_memory").select("*").eq("account_id", accountId).order("confidence", { ascending: false }).limit(20),
  ]);

  const rows = (meals || []) as Meal[];
  const todayRows = rows.filter((meal) => mealDay(meal) === today);
  const eaten = sumMeals(todayRows);
  const kcalTarget = Number(settings?.kcal_target || 0);
  const proteinTarget = Number(settings?.protein_target || settings?.protein_target_g || 0);
  const fatTarget = Number(settings?.fat_target || settings?.fat_target_g || 0);
  const carbTarget = Number(settings?.carb_target || settings?.carb_target_g || 0);

  const daily = new Map<string, Meal[]>();
  for (const meal of rows) {
    const day = mealDay(meal);
    if (!daily.has(day)) daily.set(day, []);
    daily.get(day)!.push(meal);
  }
  const activeTotals = [...daily.entries()]
    .filter(([day]) => day >= sevenDay)
    .map(([, dayMeals]) => sumMeals(dayMeals));
  const activeDays = activeTotals.length;
  const average = (key: "kcal" | "prot" | "fat" | "carb") => activeDays
    ? activeTotals.reduce((sum, total) => sum + Number(total[key] || 0), 0) / activeDays
    : 0;

  const weightRows = weights || [];
  const latestWeight = weightRows[0];
  const oldestWeight = weightRows[weightRows.length - 1];
  const weightDelta = latestWeight && oldestWeight && latestWeight.id !== oldestWeight.id
    ? Number(latestWeight.weight_kg) - Number(oldestWeight.weight_kg)
    : null;
  const hour = Number(new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    hour: "2-digit",
    hour12: false,
  }).format(new Date()));
  const expectedShare = Math.max(0.15, Math.min(1, (hour - 7) / 14));

  const averages = {
    kcal: average("kcal"),
    protein: average("prot"),
    fat: average("fat"),
    carb: average("carb"),
  };

  return {
    context: {
      settings: settings || {},
      today: {
        eaten,
        remaining: {
          kcal: kcalTarget - eaten.kcal,
          protein: proteinTarget - eaten.prot,
          fat: fatTarget - eaten.fat,
          carb: carbTarget - eaten.carb,
        },
        foods: todayRows.map((meal) => meal.dish),
        pacing: {
          eaten_share: kcalTarget > 0 ? eaten.kcal / kcalTarget : 0,
          expected_share: expectedShare,
        },
      },
      data_quality: {
        active_days_7: activeDays,
        active_days: activeDays,
        level: activeDays >= 6 ? "high" : activeDays >= 3 ? "medium" : "low",
      },
      weight_trend: {
        delta: weightDelta,
        measurements: weightRows.length,
      },
      averages,
      averages_7: averages,
    },
    recommendations: recommendations || [],
    checkins: checkins || [],
    clientMemory: memory || [],
  };
}
