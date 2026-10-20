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

// То же правило — в SQL-функции бота nutrition_targets_v1: менять только вместе.
const MACRO_REFERENCE_BMI = 27;
const MIN_CARB_G = 80;
const MIN_FAT_PER_KG = 0.6;

type TargetInput = {
  goal: string;
  sex: "male" | "female";
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: "low" | "light" | "moderate" | "high" | "very_high";
};

export function calculateNutritionTargets(input: TargetInput) {
  const activityFactors: Record<TargetInput["activityLevel"], number> = {
    low: 1.2,
    light: 1.375,
    moderate: 1.55,
    high: 1.725,
    very_high: 1.9,
  };

  const base = 10 * input.weightKg
    + 6.25 * input.heightCm
    - 5 * input.age
    + (input.sex === "male" ? 5 : -161);

  const normalizedGoal = input.goal.toLowerCase();
  const goalFactor = normalizedGoal.includes("сниж")
    ? 0.85
    : normalizedGoal.includes("набор")
      ? 1.1
      : 1;

  const minimum = input.sex === "male" ? 1500 : 1200;
  const kcal = Math.round(Math.min(6000, Math.max(minimum, base * activityFactors[input.activityLevel] * goalFactor)) / 10) * 10;
  const proteinFactor = normalizedGoal.includes("сниж") ? 1.8 : normalizedGoal.includes("набор") ? 1.7 : 1.6;

  // Белок и жир — от веса, но не больше веса при ИМТ 27: от полного веса при
  // ИМТ 40 они одни съедали бы всю норму калорий. До ИМТ 27 вес берётся полный.
  const referenceKg = Math.min(input.weightKg, MACRO_REFERENCE_BMI * (input.heightCm / 100) ** 2);
  const protein = Math.round(referenceKg * proteinFactor);
  const fat = Math.round(referenceKg * 0.8);
  const carb = Math.max(MIN_CARB_G, Math.round((kcal - protein * 4 - fat * 9) / 4));
  if (protein * 4 + fat * 9 + carb * 4 <= kcal + 5) return { kcal, protein, fat, carb };

  // Места на 80 г углеводов не осталось — жир снижается, но не ниже 0,6 г/кг, а
  // углеводы получают остаток. Сумма БЖУ не выходит за калории.
  const reducedFat = Math.max(
    Math.round(referenceKg * MIN_FAT_PER_KG),
    Math.floor((kcal - protein * 4 - MIN_CARB_G * 4) / 9),
  );
  const restCarb = Math.max(0, Math.round((kcal - protein * 4 - reducedFat * 9) / 4));
  return { kcal, protein, fat: reducedFat, carb: restCarb };
}
