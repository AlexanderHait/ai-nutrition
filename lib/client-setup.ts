export type ClientSetupSettings = {
  goal?: unknown;
  current_weight_kg?: unknown;
  height_cm?: unknown;
  kcal_target?: unknown;
};

export function clientSetupComplete(settings: ClientSetupSettings | null | undefined) {
  return Boolean(
    String(settings?.goal || "").trim()
      && Number(settings?.current_weight_kg || 0) > 0
      && Number(settings?.kcal_target || 0) > 0,
  );
}

export type ActivityLevel = "low" | "light" | "moderate" | "high" | "very_high";

type TargetInput = {
  goal: string;
  sex: "male" | "female";
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
};

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  low: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
  very_high: 1.9,
};

// Расход на поддержание: Mifflin–St Jeor × активность. Одна формула для анкеты
// и для программы к цели (lib/goal-program.ts) — иначе на одних данных они дадут
// разные калории.
export function maintenanceKcal(input: Omit<TargetInput, "goal">) {
  const base = 10 * input.weightKg
    + 6.25 * input.heightCm
    - 5 * input.age
    + (input.sex === "male" ? 5 : -161);
  return base * ACTIVITY_FACTORS[input.activityLevel];
}

export function kcalFloor(sex: TargetInput["sex"]) {
  return sex === "male" ? 1500 : 1200;
}

export function macroTargets(kcal: number, weightKg: number, goal: string) {
  const normalizedGoal = goal.toLowerCase();
  const proteinFactor = normalizedGoal.includes("сниж") ? 1.8 : normalizedGoal.includes("набор") ? 1.7 : 1.6;
  const protein = Math.round(weightKg * proteinFactor);
  const fat = Math.round(weightKg * 0.8);
  const carb = Math.max(80, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { protein, fat, carb };
}

export function calculateNutritionTargets(input: TargetInput) {
  const normalizedGoal = input.goal.toLowerCase();
  const goalFactor = normalizedGoal.includes("сниж")
    ? 0.85
    : normalizedGoal.includes("набор")
      ? 1.1
      : 1;

  const kcal = Math.round(Math.min(6000, Math.max(kcalFloor(input.sex), maintenanceKcal(input) * goalFactor)) / 10) * 10;
  return { kcal, ...macroTargets(kcal, input.weightKg, input.goal) };
}
