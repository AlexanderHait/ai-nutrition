import { describe, expect, it } from "vitest";
import { calculateNutritionTargets, clientSetupComplete } from "@/lib/client-setup";

const base = {
  sex: "male" as const,
  age: 30,
  heightCm: 175,
  weightKg: 70,
  activityLevel: "moderate" as const,
};

describe("clientSetupComplete", () => {
  it("считает анкету заполненной только при цели, весе и калориях", () => {
    expect(clientSetupComplete({ goal: "Поддержание", current_weight_kg: 70, kcal_target: 2400 })).toBe(true);
  });

  it("не пропускает пустую или частично заполненную анкету", () => {
    expect(clientSetupComplete(null)).toBe(false);
    expect(clientSetupComplete({})).toBe(false);
    expect(clientSetupComplete({ goal: "Поддержание", current_weight_kg: 70, kcal_target: 0 })).toBe(false);
    expect(clientSetupComplete({ goal: "  ", current_weight_kg: 70, kcal_target: 2400 })).toBe(false);
  });
});

describe("calculateNutritionTargets", () => {
  it("даёт дефицит при снижении и профицит при наборе", () => {
    const loss = calculateNutritionTargets({ ...base, goal: "Снижение веса" });
    const keep = calculateNutritionTargets({ ...base, goal: "Поддержание" });
    const gain = calculateNutritionTargets({ ...base, goal: "Набор массы" });

    expect(loss.kcal).toBeLessThan(keep.kcal);
    expect(gain.kcal).toBeGreaterThan(keep.kcal);
  });

  it("не опускает калории ниже физиологического минимума", () => {
    const tiny = calculateNutritionTargets({
      ...base,
      goal: "Снижение веса",
      weightKg: 40,
      heightCm: 150,
      age: 60,
      activityLevel: "low",
    });
    expect(tiny.kcal).toBeGreaterThanOrEqual(1500);

    const tinyFemale = calculateNutritionTargets({
      ...base,
      sex: "female",
      goal: "Снижение веса",
      weightKg: 40,
      heightCm: 150,
      age: 60,
      activityLevel: "low",
    });
    expect(tinyFemale.kcal).toBeGreaterThanOrEqual(1200);
  });

  it("поднимает белок на снижении веса", () => {
    const loss = calculateNutritionTargets({ ...base, goal: "Снижение веса" });
    const keep = calculateNutritionTargets({ ...base, goal: "Поддержание" });
    expect(loss.protein).toBeGreaterThan(keep.protein);
  });

  it("держит активность в правильном порядке", () => {
    const low = calculateNutritionTargets({ ...base, goal: "Поддержание", activityLevel: "low" });
    const high = calculateNutritionTargets({ ...base, goal: "Поддержание", activityLevel: "very_high" });
    expect(high.kcal).toBeGreaterThan(low.kcal);
  });

  it("возвращает целые положительные значения БЖУ", () => {
    const targets = calculateNutritionTargets({ ...base, goal: "Поддержание" });
    for (const value of [targets.kcal, targets.protein, targets.fat, targets.carb]) {
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThan(0);
    }
  });

  it("не уводит калории в бесконечность на крайних значениях", () => {
    const huge = calculateNutritionTargets({
      ...base,
      goal: "Набор массы",
      weightKg: 300,
      heightCm: 230,
      age: 14,
      activityLevel: "very_high",
    });
    expect(huge.kcal).toBeLessThanOrEqual(6000);
  });
});
