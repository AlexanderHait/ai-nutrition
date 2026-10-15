import { NextResponse } from "next/server";
import { session } from "@/lib/auth";
import { dayKey } from "@/lib/data";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  CURRENT_PROGRAM_CATALOG,
  GOAL_LABELS,
  buildProgram,
  isDay,
  planFromRow,
  programGoalFromLabel,
  programInputFromSettings,
  programProfileMissing,
  weekTargetsFor,
  type ProgramPlan,
} from "@/lib/goal-program";
import { activeProgramAccountData, latestWeightAccountData } from "@/lib/program-data";

function to(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url), 303);
}

// В client_settings пишутся только КБЖУ текущей недели — их читают бот, дневник
// и Coach. Цель и целевой вес анкеты программа не трогает: у человека может
// быть промежуточная программа на пути к большой цели. Пишем только по
// действию человека: при старте, пересборке или по кнопке «Применить».
async function applyWeekTargets(
  accountId: string,
  chatId: number | undefined,
  plan: Extract<ProgramPlan, { ok: true }>,
  today: string,
) {
  const targets = weekTargetsFor(plan, today);
  const { error } = await getSupabaseAdmin().from("client_settings").upsert({
    account_id: accountId,
    chat_id: chatId || null,
    kcal_target: targets.kcal,
    protein_target: targets.protein,
    fat_target: targets.fat,
    carb_target: targets.carb,
    updated_at: new Date().toISOString(),
  }, { onConflict: "account_id" });
  if (error) console.error("Program targets were not applied", error);
  return !error;
}

export async function POST(request: Request) {
  const current = await session();
  if (current?.role !== "client" || !current.accountId) return to(request, "/login");
  const accountId = current.accountId;

  const form = await request.formData();
  const action = String(form.get("action") || "");
  const db = getSupabaseAdmin();
  const today = dayKey();
  const now = new Date().toISOString();

  let active: Awaited<ReturnType<typeof activeProgramAccountData>>;
  try {
    active = await activeProgramAccountData(accountId);
  } catch (error) {
    console.error("Program load failed", error);
    return to(request, "/client/program?error=save");
  }
  if (!active.available) return to(request, "/client/program?error=unavailable");
  const program = active.program;

  if (action === "create" || action === "rebuild") {
    if (action === "create" && program) return to(request, "/client/program?error=exists");
    if (action === "rebuild" && !program) return to(request, "/client/program");

    let settings: Record<string, unknown> | null = null;
    let latestKg: number | null = null;
    try {
      const [settingsResult, latest] = await Promise.all([
        db.from("client_settings")
          .select("goal,sex,age_years,height_cm,current_weight_kg,target_weight_kg,activity_level")
          .eq("account_id", accountId)
          .maybeSingle(),
        latestWeightAccountData(accountId),
      ]);
      if (settingsResult.error) throw settingsResult.error;
      settings = settingsResult.data;
      latestKg = latest?.kg ?? null;
    } catch (error) {
      console.error("Program inputs load failed", error);
      return to(request, "/client/program?error=save");
    }
    if (programProfileMissing(settings, latestKg)) return to(request, "/client/setup");

    const goal = programGoalFromLabel(action === "create" ? form.get("goal") : program?.goal_kind);
    if (!goal) return to(request, "/client/program?error=fields");
    const targetWeightKg = action === "create"
      ? Number(String(form.get("target_weight_kg") || "").replace(",", "."))
      : Number(program?.target_weight_kg);
    const rawDay = String(form.get("target_day") || "") || (action === "rebuild" ? String(program?.target_day || "") : "");
    const targetDay = isDay(rawDay) ? rawDay : null;

    const input = programInputFromSettings(settings, latestKg, { goal, targetWeightKg, targetDay }, today);
    const plan = buildProgram(input);
    if (!plan.ok) {
      // Ничего не сохранено. Возвращаем на расчёт с теми же значениями —
      // страница пересчитает и покажет причину и реальную дату.
      const params = new URLSearchParams({
        goal: GOAL_LABELS[goal],
        target_weight: Number.isFinite(targetWeightKg) ? String(targetWeightKg) : "",
        target_day: rawDay,
      });
      if (action === "rebuild") params.set("rebuild", "1");
      return to(request, `/client/program?${params}#preview`);
    }

    // Активная программа у человека одна (уникальный индекс), поэтому старую
    // закрываем до вставки новой и возвращаем, если вставка не удалась.
    if (action === "rebuild" && program) {
      const { data: archived, error } = await db.from("nutrition_programs")
        .update({ status: "archived", closed_at: now, close_reason: "rebuild", updated_at: now })
        .eq("id", program.id)
        .eq("status", "active")
        .select("id");
      if (error) {
        console.error("Program archive failed", error);
        return to(request, "/client/program?error=save");
      }
      // Программу уже закрыли в другой вкладке — ничего не создаём.
      if (!archived?.length) return to(request, "/client/program?error=changed");
    }

    const { error: insertError } = await db.from("nutrition_programs").insert({
      account_id: accountId,
      chat_id: current.chatId || null,
      status: "active",
      goal_kind: goal,
      start_day: plan.summary.startDay,
      target_day: plan.summary.targetDay,
      start_weight_kg: plan.summary.startWeightKg,
      target_weight_kg: plan.summary.targetWeightKg,
      inputs: {
        sex: input.sex,
        age_years: input.age,
        height_cm: input.heightCm,
        activity_level: input.activityLevel,
      },
      catalog_version: CURRENT_PROGRAM_CATALOG.version,
    });
    if (insertError) {
      if (action === "rebuild" && program) {
        const { error: restoreError } = await db.from("nutrition_programs")
          .update({ status: "active", closed_at: null, close_reason: null, updated_at: now })
          .eq("id", program.id)
          .eq("status", "archived");
        if (restoreError) console.error("Program restore after failed rebuild failed", { programId: program.id, restoreError });
      }
      if (insertError.code === "23505") return to(request, "/client/program?error=exists");
      console.error("Program insert failed", insertError);
      return to(request, "/client/program?error=save");
    }

    const applied = await applyWeekTargets(accountId, current.chatId, plan, today);
    const done = action === "create" ? "started=1" : "rebuilt=1";
    return to(request, `/client/program?${done}${applied ? "" : "&error=targets"}`);
  }

  if (action === "apply") {
    if (!program) return to(request, "/client/program");
    const plan = planFromRow(program);
    if (!plan?.ok) return to(request, "/client/program?error=format");
    const applied = await applyWeekTargets(accountId, current.chatId, plan, today);
    return to(request, applied ? "/client/program?applied=1" : "/client/program?error=targets");
  }

  if (action === "stop") {
    if (!program) return to(request, "/client/program");
    const plan = planFromRow(program);
    const finished = Boolean(plan?.ok && today >= plan.summary.targetDay);
    const { data: closed, error } = await db.from("nutrition_programs")
      .update({
        status: finished ? "completed" : "archived",
        closed_at: now,
        close_reason: finished ? "finished" : "stopped",
        updated_at: now,
      })
      .eq("id", program.id)
      .eq("status", "active")
      .select("id");
    if (error) {
      console.error("Program stop failed", error);
      return to(request, "/client/program?error=save");
    }
    if (!closed?.length) return to(request, "/client/program?error=changed");
    return to(request, "/client/program?stopped=1");
  }

  return to(request, "/client/program");
}
