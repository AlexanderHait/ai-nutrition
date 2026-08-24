import { describe, expect, it } from "vitest";
import { DEFAULT_PLAN_LIMITS, tierPromise } from "@/components/PlanCompare";

describe("лимиты тарифов на странице сравнения", () => {
  it("значения по умолчанию совпадают с сегодняшним справочником", () => {
    // Страница уже устаревала: обещала free 3 фото и 5 запросов, когда
    // в базе было 10 и 10. Тест ловит расхождение, если кто-то поправит
    // только вёрстку или только базу.
    expect(DEFAULT_PLAN_LIMITS).toEqual({
      freePhoto: 10,
      freeAi: 10,
      basicPhoto: 40,
      basicAi: 20,
    });
  });

  it("обещание Basic называет реальное число фото", () => {
    expect(tierPromise("basic")).toContain("40 фото");
    expect(tierPromise("basic", { basicPhoto: 60 })).toContain("60 фото");
    expect(tierPromise("basic", { basicPhoto: 60 })).not.toContain("40 фото");
  });

  it("обещания free и premium чисел не содержат и не ломаются", () => {
    expect(tierPromise("free", { freePhoto: 25 })).toBe("Ведёшь дневник и видишь КБЖУ");
    expect(tierPromise("premium")).toContain("нутрициолог");
  });
});
