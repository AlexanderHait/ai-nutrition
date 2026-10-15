import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { dayKey, mealDay } from "@/lib/data";
import type { DayFact, ProgramRow, WeightFact } from "@/lib/goal-program";

export type StoredProgram = ProgramRow & {
  id: string;
  status: "active" | "completed" | "archived";
  created_at: string;
};

const PROGRAM_COLUMNS = "id,status,goal_kind,start_day,target_day,start_weight_kg,target_weight_kg,inputs,catalog_version,created_at";

// Таблица nutrition_programs появляется миграцией 20261016120000. Пока её нет
// в базе, раздел честно говорит «готовится», а не падает с ошибкой.
export function isMissingProgramTable(error: { code?: string } | null | undefined) {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

export async function activeProgramAccountData(accountId: string) {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("nutrition_programs")
    .select(PROGRAM_COLUMNS)
    .eq("account_id", accountId)
    .eq("status", "active")
    .maybeSingle();
  if (error) {
    if (isMissingProgramTable(error)) return { available: false as const, program: null };
    throw error;
  }
  return { available: true as const, program: (data || null) as StoredProgram | null };
}

const PAGE = 1000;
const MAX_PAGES = 20;

// Итоги по дням и измерения веса за период программы. Приёмы читаются
// страницами: у базы есть предел строк на один ответ, и без страниц длинная
// программа молча потеряла бы старые недели.
export async function programFactsAccountData(accountId: string, fromDay: string, toDay: string) {
  const db = getSupabaseAdmin();
  const facts = new Map<string, DayFact>();
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await db
      .from("meals")
      .select("id,kcal,eaten_at,eaten_day")
      .eq("account_id", accountId)
      .eq("deleted", false)
      .gte("eaten_day", fromDay)
      .lte("eaten_day", toDay)
      .order("id", { ascending: true })
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) throw error;
    for (const row of data || []) {
      const day = mealDay(row as { eaten_at: string; eaten_day: string });
      const fact = facts.get(day) || { kcal: 0, meals: 0 };
      fact.kcal += Number(row.kcal || 0);
      fact.meals += 1;
      facts.set(day, fact);
    }
    if (!data || data.length < PAGE) break;
    if (page === MAX_PAGES - 1) console.error("Program facts truncated", { accountId, fromDay, toDay });
  }

  // Сутки питания — московские с 00:00 (Б-06), поэтому начало периода — полночь МСК.
  const { data: weightRows, error: weightError } = await db
    .from("weight_logs")
    .select("weight_kg,measured_at")
    .eq("account_id", accountId)
    .gte("measured_at", `${fromDay}T00:00:00+03:00`)
    .order("measured_at", { ascending: true })
    .limit(1000);
  if (weightError) throw weightError;
  const weights: WeightFact[] = (weightRows || [])
    .map((row) => ({ day: dayKey(new Date(row.measured_at)), kg: Number(row.weight_kg) }))
    .filter((row) => row.day <= toDay && Number.isFinite(row.kg) && row.kg > 0);

  return { facts, weights };
}

// «Взвешиваний нет» и «база не ответила» — разные случаи: при сбое не стартуем
// молча от устаревшего веса из анкеты, а показываем ошибку.
export async function latestWeightAccountData(accountId: string) {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("weight_logs")
    .select("weight_kg,measured_at")
    .eq("account_id", accountId)
    .order("measured_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? { kg: Number(data.weight_kg), day: dayKey(new Date(data.measured_at)) } : null;
}
