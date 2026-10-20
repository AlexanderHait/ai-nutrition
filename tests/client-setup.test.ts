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

// БЖУ обязаны помещаться в норму калорий: 4 ккал на грамм белка и углеводов,
// 9 — на грамм жира. Допуск 5 ккал — на округление граммов до целых.
const ROUNDING_KCAL = 5;
const GOALS = ["Снижение веса", "Поддержание", "Набор массы"];
const ACTIVITIES = ["low", "light", "moderate", "high", "very_high"] as const;
const AGES = [14, 18, 25, 35, 45, 55, 65, 75, 85, 100];

// Все сочетания анкеты, которые пропускает форма: пол, возраст, рост
// 120–230 см, вес от ИМТ 16 до ИМТ 45 (в пределах 35–300 кг), цель, активность.
function* questionnaireGrid() {
  for (const sex of ["male", "female"] as const) {
    for (const age of AGES) {
      for (let heightCm = 120; heightCm <= 230; heightCm += 5) {
        for (let bmi = 16; bmi <= 45; bmi += 1) {
          const weightKg = Math.round(bmi * (heightCm / 100) ** 2 * 10) / 10;
          if (weightKg < 35 || weightKg > 300) continue;
          for (const goal of GOALS) {
            for (const activityLevel of ACTIVITIES) {
              yield { sex, age, heightCm, weightKg, goal, activityLevel, bmi };
            }
          }
        }
      }
    }
  }
}

describe("calculateNutritionTargets: БЖУ внутри калорий", () => {
  it("на всей сетке анкеты сумма калорий из БЖУ не больше нормы, граммы не отрицательные", () => {
    let checked = 0;
    const broken: string[] = [];
    for (const { bmi, ...input } of questionnaireGrid()) {
      checked += 1;
      const t = calculateNutritionTargets(input);
      const macroKcal = t.protein * 4 + t.fat * 9 + t.carb * 4;
      const grams = [t.protein, t.fat, t.carb];
      if (macroKcal > t.kcal + ROUNDING_KCAL || grams.some((g) => g < 0 || !Number.isInteger(g))) {
        broken.push(
          `${input.sex} ${input.age} лет ${input.heightCm} см ${input.weightKg} кг (ИМТ ${bmi}) ${input.goal} ${input.activityLevel}: `
          + `${t.kcal} ккал, а Б${t.protein} Ж${t.fat} У${t.carb} = ${macroKcal} ккал`,
        );
      }
    }
    expect(checked).toBeGreaterThan(100_000);
    expect(broken.slice(0, 5), `нарушений: ${broken.length} из ${checked}`).toEqual([]);
  });

  it("у человека с ИМТ 40 белок и жир не считаются от полного веса", () => {
    // 165 см, 109 кг. Раньше: 1770 ккал, а Б196 Ж87 У80 = 1887 ккал.
    const t = calculateNutritionTargets({
      sex: "female",
      age: 45,
      heightCm: 165,
      weightKg: 108.9,
      goal: "Снижение веса",
      activityLevel: "low",
    });
    expect(t.protein * 4 + t.fat * 9 + t.carb * 4).toBeLessThanOrEqual(t.kcal + ROUNDING_KCAL);
    expect(t.protein).toBeLessThan(Math.round(108.9 * 1.8));
  });
});
