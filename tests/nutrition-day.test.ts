import { describe, expect, it } from "vitest";
import { dayKey, mealDay } from "@/lib/data";

// Сутки питания идут с 03:00 МСК до 02:59 следующих календарных суток.
const msk = (iso: string) => new Date(iso);

describe("граница суток питания", () => {
  it("вечер остаётся своим днём", () => {
    expect(dayKey(msk("2026-08-11T18:00:00+03:00"))).toBe("2026-08-11");
    expect(dayKey(msk("2026-08-11T23:59:00+03:00"))).toBe("2026-08-11");
  });

  it("ночь до 03:00 уходит в прошлый день", () => {
    expect(dayKey(msk("2026-08-12T00:30:00+03:00"))).toBe("2026-08-11");
    expect(dayKey(msk("2026-08-12T02:59:00+03:00"))).toBe("2026-08-11");
  });

  it("с 03:00 начинается новый день", () => {
    expect(dayKey(msk("2026-08-12T03:00:00+03:00"))).toBe("2026-08-12");
    expect(dayKey(msk("2026-08-12T09:00:00+03:00"))).toBe("2026-08-12");
  });

  it("mealDay доверяет дню из базы, а без него считает сам", () => {
    // База уже посчитала — берём как есть.
    expect(mealDay({ eaten_at: "2026-08-12T00:30:00+03:00", eaten_day: "2026-08-11" })).toBe("2026-08-11");
    // Дня из базы нет — считаем по тому же правилу, а не по календарю.
    expect(mealDay({ eaten_at: "2026-08-12T00:30:00+03:00", eaten_day: "" as unknown as string })).toBe("2026-08-11");
    expect(mealDay({ eaten_at: "2026-08-12T13:00:00+03:00", eaten_day: "" as unknown as string })).toBe("2026-08-12");
  });
});
