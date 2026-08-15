import { describe, expect, it } from "vitest";
import { mealQuality } from "@/lib/meal-quality";

// Числа у всех примеров арифметически безупречны: калории сходятся с БЖУ,
// калорийность на 100 г правдоподобна. Раньше этого было достаточно, чтобы
// запись считалась хорошей, — и правдоподобная выдумка проходила как факт.
const plausible = { dish: "Блины с начинкой", grams: 300, kcal: 576, prot: 14, fat: 22, carb: 78 };

describe("mealQuality и происхождение чисел", () => {
  it("считает запись из каталога чистой", () => {
    const q = mealQuality({
      ...plausible,
      nutrition_source: "official_catalog",
      weight_source: "catalog_portion",
      needs_check: false,
    });
    expect(q.level).toBe("ok");
    expect(q.reasons).toEqual([]);
  });

  it("помечает догадку AI, даже когда арифметика сходится", () => {
    const q = mealQuality({ ...plausible, nutrition_source: "estimate", weight_source: "catalog_portion" });
    expect(q.level).toBe("check");
    expect(q.reasons).toContain("КБЖУ без источника — оценка AI");
  });

  it("помечает вес, определённый на глаз", () => {
    const q = mealQuality({
      ...plausible,
      nutrition_source: "official_catalog",
      weight_source: "unknown_visual_estimate",
    });
    expect(q.level).toBe("check");
    expect(q.reasons).toContain("Вес определён на глаз");
  });

  it("не теряет пометку бота, даже если источники выглядят нормально", () => {
    const q = mealQuality({
      ...plausible,
      nutrition_source: "verified_catalog",
      weight_source: "user_confirmed",
      needs_check: true,
    });
    expect(q.level).toBe("check");
    expect(q.reasons).toContain("Бот просил проверить эту позицию");
  });

  it("старые записи без происхождения оцениваются как раньше", () => {
    // Поля отсутствуют — значит запись сделана до 09.08.2026, и придумывать
    // претензии к ней нельзя.
    expect(mealQuality(plausible).level).toBe("ok");
    expect(mealQuality({ ...plausible, nutrition_source: null, weight_source: null }).level).toBe("ok");
  });

  it("арифметические проверки продолжают работать", () => {
    expect(mealQuality({ ...plausible, grams: 0 }).level).toBe("bad");
    expect(mealQuality({ ...plausible, kcal: 5000 }).level).toBe("bad");
  });
});
