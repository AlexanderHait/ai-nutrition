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
  const protein = Math.round(input.weightKg * proteinFactor);
  const fat = Math.round(input.weightKg * 0.8);
  const carb = Math.max(80, Math.round((kcal - protein * 4 - fat * 9) / 4));

  return { kcal, protein, fat, carb };
}
