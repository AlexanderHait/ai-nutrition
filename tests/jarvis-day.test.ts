import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Поддельная база: хранит строки двух клиентов и честно применяет фильтры
// запроса, поэтому тест видит, чьи записи на самом деле ушли бы наружу.
const db = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  error: null as null | { code: string; message: string },
  calls: 0,
  filters: [] as [string, unknown][],
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => {
    db.calls += 1;
    const filters: [string, unknown][] = [];
    db.filters = filters;
    const query: any = {
      from: () => query,
      select: () => query,
      order: () => query,
      limit: () => query,
      eq: (column: string, value: unknown) => {
        filters.push([column, value]);
        return query;
      },
      then: (resolve: (v: unknown) => unknown) =>
        resolve(
          db.error
            ? { data: null, error: db.error }
            : { data: db.rows.filter((r) => filters.every(([c, v]) => r[c] === v)), error: null },
        ),
    };
    return query;
  },
}));

import { GET } from "@/app/api/jarvis/day/route";

// Ключ JARVIS — 32 случайных байта в hex; TeddY знает только его отпечаток.
const KEY = "0f".repeat(32);
const FINGERPRINT = createHash("sha256").update(KEY).digest("hex");
const OWNER = 1246990819;
const OTHER = 163304082;

const meal = (id: number, chat_id: number, eaten_at: string, eaten_day: string, dish: string,
  kcal: number, prot: number, fat: number, carb: number, deleted = false) =>
  ({ id, chat_id, dish, grams: 100, kcal, prot, fat, carb, eaten_at, eaten_day, deleted });

const call = (query = "?day=2026-10-13", headers: Record<string, string> = { authorization: `Bearer ${KEY}` }) =>
  GET(new Request(`https://www.smartnutrition-ai.ru/api/jarvis/day${query}`, { headers }));

beforeEach(() => {
  process.env.JARVIS_READ_TOKEN_SHA256 = FINGERPRINT;
  process.env.JARVIS_READ_CHAT_ID = String(OWNER);
  db.error = null;
  db.calls = 0;
  db.filters = [];
  db.rows = [
    // Завтрак: два блюда с разницей 5 минут — один приём.
    meal(1, OWNER, "2026-10-13T05:40:00+00:00", "2026-10-13", "Овсянка", 300.4, 10.2, 6.1, 52.3),
    meal(2, OWNER, "2026-10-13T05:45:00+00:00", "2026-10-13", "Банан", 120.3, 1.5, 0.4, 27.2),
    // Обед — отдельный приём.
    meal(3, OWNER, "2026-10-13T09:30:00+00:00", "2026-10-13", "Суп с курицей", 410, 32, 14.2, 37.9),
    // Удалённое блюдо и блюдо другого дня не считаются.
    meal(4, OWNER, "2026-10-13T10:00:00+00:00", "2026-10-13", "Удалённый торт", 900, 5, 50, 100, true),
    meal(5, OWNER, "2026-10-12T15:00:00+00:00", "2026-10-12", "Вчерашний ужин", 700, 40, 20, 80),
    // Чужой дневник в тот же день.
    meal(6, OTHER, "2026-10-13T06:00:00+00:00", "2026-10-13", "Чужая пицца", 1200, 50, 60, 120),
  ];
});

afterEach(() => {
  delete process.env.JARVIS_READ_TOKEN_SHA256;
  delete process.env.JARVIS_READ_CHAT_ID;
  vi.useRealTimers();
});

describe("GET /api/jarvis/day", () => {
  it("без переменных адрес выключен: 404 и база не трогается", async () => {
    delete process.env.JARVIS_READ_TOKEN_SHA256;
    expect((await call()).status).toBe(404);
    process.env.JARVIS_READ_TOKEN_SHA256 = FINGERPRINT;
    delete process.env.JARVIS_READ_CHAT_ID;
    expect((await call()).status).toBe(404);
    process.env.JARVIS_READ_CHAT_ID = "abc";
    expect((await call()).status).toBe(404);
    process.env.JARVIS_READ_CHAT_ID = String(OWNER);
    process.env.JARVIS_READ_TOKEN_SHA256 = "не-отпечаток";
    expect((await call()).status).toBe(404);
    expect(db.calls).toBe(0);
  });

  it("без ключа и с чужим ключом — 401, база не трогается", async () => {
    expect((await call("?day=2026-10-13", {})).status).toBe(401);
    expect((await call("?day=2026-10-13", { authorization: "Bearer " })).status).toBe(401);
    expect((await call("?day=2026-10-13", { authorization: `Bearer ${"ab".repeat(32)}` })).status).toBe(401);
    // Отпечаток вместо ключа тоже не подходит.
    expect((await call("?day=2026-10-13", { authorization: `Bearer ${FINGERPRINT}` })).status).toBe(401);
    expect((await call("?day=2026-10-13", { authorization: KEY })).status).toBe(401);
    expect(db.calls).toBe(0);
  });

  it("chat_id из запроса игнорируется: читается только дневник владельца", async () => {
    const res = await call(`?day=2026-10-13&chat_id=${OTHER}`);
    expect(res.status).toBe(200);
    expect(db.filters).toContainEqual(["chat_id", OWNER]);
    expect(db.filters).not.toContainEqual(["chat_id", OTHER]);
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain("Чужая пицца");
  });

  it("плохой день — 400", async () => {
    for (const day of ["2026-13-01", "2026-02-30", "13.10.2026", "2026-10-13x", "сегодня"]) {
      const res = await call(`?day=${encodeURIComponent(day)}`);
      expect(res.status, day).toBe(400);
    }
    expect(db.calls).toBe(0);
  });

  it("база не ответила — 503", async () => {
    db.error = { code: "57014", message: "timeout" };
    const res = await call();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "unavailable" });
  });

  it("итоги и приёмы дня считаются верно", async () => {
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      day: "2026-10-13",
      kcal: 831, // 300.4 + 120.3 + 410
      protein: 44, // 10.2 + 1.5 + 32
      fat: 21, // 6.1 + 0.4 + 14.2
      carbs: 117, // 52.3 + 27.2 + 37.9
      meals: [
        { time: "2026-10-13T05:40:00+00:00", title: "Овсянка, Банан", kcal: 421 },
        { time: "2026-10-13T09:30:00+00:00", title: "Суп с курицей", kcal: 410 },
      ],
    });
  });

  it("пустой день — нули и пустой список", async () => {
    const res = await call("?day=2026-10-01");
    expect(await res.json()).toEqual({ day: "2026-10-01", kcal: 0, protein: 0, fat: 0, carbs: 0, meals: [] });
  });

  it("без day берётся текущий день TeddY (сутки с 03:00 МСК)", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    // 02:30 МСК 14.10 — по правилу Б-06 это ещё 13.10.
    vi.setSystemTime(new Date("2026-10-14T02:30:00+03:00"));
    const body = await (await call("")).json();
    expect(body.day).toBe("2026-10-13");
    expect(db.filters).toContainEqual(["eaten_day", "2026-10-13"]);
  });

  it("у всех ответов Cache-Control: no-store", async () => {
    const responses = [await call(), await call("?day=bad"), await call("?day=2026-10-13", {})];
    delete process.env.JARVIS_READ_TOKEN_SHA256;
    responses.push(await call());
    db.error = { code: "x", message: "x" };
    process.env.JARVIS_READ_TOKEN_SHA256 = FINGERPRINT;
    responses.push(await call());
    expect(responses.map((r) => r.status)).toEqual([200, 400, 401, 404, 503]);
    for (const r of responses) expect(r.headers.get("cache-control")).toBe("no-store");
  });
});
