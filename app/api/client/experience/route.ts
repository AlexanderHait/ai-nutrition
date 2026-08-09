import crypto from "crypto";
import { NextResponse } from "next/server";
import { session } from "@/lib/auth";
import { clientSetupComplete } from "@/lib/client-setup";
import { dayKey, mealDay, sumMeals, type Meal } from "@/lib/data";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

// Уведомление считается заново при каждом запросе, поэтому «удалить» его
// буквально нельзя. Подпись — это отпечаток текста: пока он тот же, значит
// сигнал тот же, и закрытое уведомление не показывается снова.
const DISMISS_TTL_DAYS = 30;

function noticeSignature(notice: { id: string; title: string; text: string }) {
  return crypto
    .createHash("sha256")
    .update(`${notice.id}\n${notice.title}\n${notice.text}`)
    .digest("hex")
    .slice(0, 32);
}

type Notice = {
  id: string;
  tone: "warning" | "info" | "good";
  title: string;
  text: string;
  href: string;
};

type Achievement = {
  id: string;
  title: string;
  text: string;
};

function shiftDay(value: string, delta: number) {
  const date = new Date(`${value}T12:00:00+03:00`);
  date.setDate(date.getDate() + delta);
  return dayKey(date);
}

export async function GET() {
  const current = await session();
  if (current?.role !== "client" || !current.accountId) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  const start = new Date();
  start.setDate(start.getDate() - 13);
  const fromDay = dayKey(start);
  const recognitionFrom = new Date(Date.now() - 7 * 86400000).toISOString();

  const [
    { data: settings },
    { data: meals },
    { data: weights },
    { data: subscription },
    { data: digest },
    { count: reviewCount },
    { data: dismissals },
  ] = await Promise.all([
    db.from("client_settings").select("*").eq("account_id", current.accountId).maybeSingle(),
    db.from("meals")
      .select("id,chat_id,dish,grams,kcal,prot,fat,carb,eaten_at,eaten_day,deleted")
      .eq("account_id", current.accountId)
      .eq("deleted", false)
      .gte("eaten_day", fromDay)
      .order("eaten_at", { ascending: false })
      .limit(1200),
    db.from("weight_logs")
      .select("id,weight_kg,measured_at")
      .eq("account_id", current.accountId)
      .order("measured_at", { ascending: false })
      .limit(10),
    db.from("subscriptions")
      .select("plan,status,ends_at,created_at")
      .eq("account_id", current.accountId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db.from("digests")
      .select("id,for_date,summary_md")
      .eq("account_id", current.accountId)
      .order("for_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db.from("recognition_events")
      .select("id", { count: "exact", head: true })
      .eq("account_id", current.accountId)
      .eq("needs_confirmation", true)
      .gte("created_at", recognitionFrom),
    db.from("client_notice_dismissals")
      .select("notice_id,signature")
      .eq("account_id", current.accountId)
      .gte("dismissed_at", new Date(Date.now() - DISMISS_TTL_DAYS * 86400000).toISOString()),
  ]);

  const rows = (meals || []) as Meal[];
  const byDay = new Map<string, Meal[]>();
  for (const meal of rows) {
    const key = mealDay(meal);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(meal);
  }

  const activeDays = byDay.size;
  const today = dayKey();
  let cursor = byDay.has(today) ? today : shiftDay(today, -1);
  let streak = 0;
  while (byDay.has(cursor) && streak < 30) {
    streak += 1;
    cursor = shiftDay(cursor, -1);
  }

  const orderedDays = [...byDay.entries()]
    .sort(([a], [b]) => b.localeCompare(a));
  const recentTotals = orderedDays.slice(0, 3).map(([, dayMeals]) => sumMeals(dayMeals));
  const average = (key: "kcal" | "prot") => recentTotals.length
    ? recentTotals.reduce((total, row) => total + Number(row[key] || 0), 0) / recentTotals.length
    : 0;

  const kcalTarget = Number(settings?.kcal_target || 0);
  const proteinTarget = Number(settings?.protein_target || 0);
  const avgKcal = average("kcal");
  const avgProtein = average("prot");
  const latestMealAt = rows[0]?.eaten_at ? new Date(rows[0].eaten_at).getTime() : 0;

  const weightRows = weights || [];
  const latestWeight = weightRows[0] ? Number(weightRows[0].weight_kg) : 0;
  const oldestWeight = weightRows[weightRows.length - 1] ? Number(weightRows[weightRows.length - 1].weight_kg) : 0;
  const targetWeight = Number(settings?.target_weight_kg || 0);
  const goal = String(settings?.goal || "").toLowerCase();
  const hasWeightTrend = weightRows.length >= 2 && latestWeight > 0 && oldestWeight > 0;
  const movedTowardTarget = hasWeightTrend && targetWeight > 0
    ? Math.abs(latestWeight - targetWeight) + 0.1 < Math.abs(oldestWeight - targetWeight)
    : false;
  const movedAgainstGoal = hasWeightTrend && (
    goal.includes("набор")
      ? latestWeight < oldestWeight - 0.2
      : goal.includes("сниж")
        ? latestWeight > oldestWeight + 0.2
        : false
  );

  const premium = subscription?.plan === "premium"
    && subscription?.status === "active"
    && (!subscription.ends_at || new Date(subscription.ends_at).getTime() > Date.now());

  const notices: Notice[] = [];
  if (!clientSetupComplete(settings)) {
    notices.push({
      id: "setup",
      tone: "warning",
      title: "Заверши настройку профиля",
      text: "TeddY рассчитает персональные калории и БЖУ примерно за две минуты.",
      href: "/client/setup",
    });
  }
  if ((reviewCount || 0) > 0) {
    notices.push({
      id: "review",
      tone: "warning",
      title: "Есть позиции для быстрой проверки",
      text: `${reviewCount} распознаваний выглядят приблизительно. Уточни только их — остальные записи уже сохранены.`,
      href: "/client/nutrition",
    });
  }
  if (!rows.length) {
    notices.push({
      id: "first-meal",
      tone: "info",
      title: "Добавь первый приём пищи",
      text: "После первой записи появится остаток калорий, а после трёх дней — первые закономерности.",
      href: "/client/nutrition",
    });
  } else if (latestMealAt && Date.now() - latestMealAt > 2 * 86400000) {
    notices.push({
      id: "return",
      tone: "info",
      title: "Давно не было новых записей",
      text: "Добавь сегодняшний рацион, чтобы рекомендации снова опирались на актуальные данные.",
      href: "/client/nutrition",
    });
  }
  if (recentTotals.length >= 2 && kcalTarget > 0 && avgKcal < kcalTarget * 0.75) {
    notices.push({
      id: "calorie-gap",
      tone: "warning",
      title: "Несколько дней подряд заметный недобор",
      text: `В среднем около ${Math.round(avgKcal)} ккал при цели ${Math.round(kcalTarget)}. Это уже похоже на тенденцию, а не один случайный день.`,
      href: "/client/progress",
    });
  }
  if (movedAgainstGoal) {
    notices.push({
      id: "weight-direction",
      tone: "warning",
      title: "Вес движется против выбранной цели",
      text: `Последнее изменение: ${latestWeight > oldestWeight ? "+" : ""}${(latestWeight - oldestWeight).toFixed(1)} кг. Посмотри связь с рационом.`,
      href: "/client/progress",
    });
  }
  if (subscription?.ends_at) {
    const daysLeft = Math.ceil((new Date(subscription.ends_at).getTime() - Date.now()) / 86400000);
    if (daysLeft >= 0 && daysLeft <= 5) {
      notices.push({
        id: "subscription",
        tone: "info",
        title: "Подписка скоро закончится",
        text: daysLeft === 0 ? "Доступ заканчивается сегодня." : `До окончания доступа ${daysLeft} дн.`,
        href: "/client/plan",
      });
    }
  }
  if (digest?.for_date && Date.now() - new Date(`${digest.for_date}T12:00:00+03:00`).getTime() < 8 * 86400000) {
    notices.push({
      id: "digest",
      tone: "good",
      title: "Готов новый недельный разбор",
      text: "TeddY собрал изменения, привычки и главный фокус на следующую неделю.",
      href: "/client/progress",
    });
  }

  const achievements: Achievement[] = [];
  if (streak >= 3) {
    achievements.push({ id: "streak", title: `${streak} дней подряд`, text: "Дневник стал стабильной привычкой." });
  }
  if (activeDays >= 6) {
    achievements.push({ id: "week", title: "Неделя почти без пропусков", text: `${activeDays} дней с реальным рационом за последние 14 дней.` });
  }
  const proteinDays = [...byDay.values()].filter((dayMeals) => {
    const total = sumMeals(dayMeals);
    return proteinTarget > 0 && total.prot >= proteinTarget * 0.9;
  }).length;
  if (proteinDays >= 4) {
    achievements.push({ id: "protein", title: "Белок закрепляется", text: `${proteinDays} дней рядом с целевым значением.` });
  }
  if (movedTowardTarget) {
    achievements.push({ id: "weight", title: "Вес движется к цели", text: `Изменение ${(latestWeight - oldestWeight).toFixed(1)} кг в нужном направлении.` });
  }

  let premiumMoment: { title: string; text: string } | null = null;
  if (!premium && activeDays >= 3) {
    if (kcalTarget > 0 && avgKcal < kcalTarget * 0.85) {
      premiumMoment = {
        title: "TeddY заметил устойчивый недобор калорий",
        text: "В Premium он разберёт причину и соберёт конкретный план следующего приёма и недели.",
      };
    } else if (proteinTarget > 0 && avgProtein < proteinTarget * 0.85) {
      premiumMoment = {
        title: "TeddY заметил повторяющийся недобор белка",
        text: "Premium предложит продукты и порции под твой привычный рацион, а не общий список советов.",
      };
    } else {
      premiumMoment = {
        title: "Данных уже достаточно для персонального разбора",
        text: "Premium объяснит, что меняется, почему это происходит и что сделать следующим шагом.",
      };
    }
  }

  const hidden = new Map((dismissals || []).map((row) => [row.notice_id, row.signature]));
  const visible = notices
    .map((notice) => ({ ...notice, signature: noticeSignature(notice) }))
    .filter((notice) => hidden.get(notice.id) !== notice.signature);

  return NextResponse.json({
    ok: true,
    setup_required: !clientSetupComplete(settings),
    notices: visible.slice(0, 4),
    achievements: achievements.slice(0, 3),
    premium_moment: premiumMoment,
  });
}

// Закрытие уведомления. Подпись приходит от клиента вместе с уведомлением,
// поэтому закрывается ровно тот текст, который человек видел.
export async function POST(request: Request) {
  const current = await session();
  if (current?.role !== "client" || !current.accountId) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as
    | { notice_id?: unknown; signature?: unknown }
    | null;
  const noticeId = String(body?.notice_id || "").trim().slice(0, 64);
  const signature = String(body?.signature || "").trim().slice(0, 64);
  if (!noticeId || !signature) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin()
    .from("client_notice_dismissals")
    .upsert(
      {
        account_id: current.accountId,
        notice_id: noticeId,
        signature,
        dismissed_at: new Date().toISOString(),
      },
      { onConflict: "account_id,notice_id" },
    );

  if (error) {
    console.error("notice dismiss failed", { code: error.code, message: error.message });
    return NextResponse.json({ ok: false, error: "save_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
