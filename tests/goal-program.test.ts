import { describe, expect, it } from "vitest";
import { calculateNutritionTargets, kcalFloor, maintenanceKcal } from "@/lib/client-setup";
import {
  CURRENT_PROGRAM_CATALOG,
  addDays,
  buildProgram,
  daysBetween,
  isDay,
  planFromRow,
  programSignals,
  reviewWeeks,
  storedPlan,
  type DayFact,
  type ProgramCatalog,
  type ProgramInput,
  type ProgramPlan,
} from "@/lib/goal-program";

const START = "2026-10-19";

const loss: ProgramInput = {
  goal: "loss",
  sex: "male",
  age: 30,
  heightCm: 175,
  activityLevel: "moderate",
  startWeightKg: 80,
  targetWeightKg: 74,
  startDay: START,
  targetDay: addDays(START, 16 * 7),
};

function okPlan(plan: ProgramPlan) {
  if (!plan.ok) throw new Error(`ожидалась программа, получено: ${plan.problem.code}`);
  return plan;
}

describe("calculateNutritionTargets после выноса общей формулы", () => {
  it("даёт ровно те же числа, что и раньше", () => {
    const base = { sex: "male" as const, age: 30, heightCm: 175, weightKg: 70, activityLevel: "moderate" as const };
    expect(calculateNutritionTargets({ ...base, goal: "Снижение веса" })).toEqual({ kcal: 2170, protein: 126, fat: 56, carb: 291 });
    expect(calculateNutritionTargets({ ...base, goal: "Поддержание" })).toEqual({ kcal: 2560, protein: 112, fat: 56, carb: 402 });
    expect(calculateNutritionTargets({ ...base, goal: "Набор массы" })).toEqual({ kcal: 2810, protein: 119, fat: 56, carb: 458 });
  });
});

describe("даты программы", () => {
  it("считает дни через границы месяцев и года", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(daysBetween("2026-10-19", "2027-02-08")).toBe(112);
  });

  it("не принимает несуществующие даты", () => {
    expect(isDay("2026-02-30")).toBe(false);
    expect(isDay("2026-10-19")).toBe(true);
    expect(isDay("19.10.2026")).toBe(false);
  });
});

describe("buildProgram: снижение веса", () => {
  const plan = okPlan(buildProgram(loss));

  it("раскладывает 16 недель по этапам и добавляет закрепление после даты", () => {
    expect(plan.weeks).toHaveLength(18);
    expect(plan.phases.map((phase) => [phase.phase, phase.weeks])).toEqual([
      ["entry", 2],
      ["main", 8],
      ["break", 1],
      ["main", 5],
      ["hold", 2],
    ]);
    expect(plan.weeks.filter((week) => week.afterTarget).every((week) => week.phase === "hold")).toBe(true);
  });

  it("недели идут подряд без пропусков и последняя до цели заканчивается накануне даты", () => {
    for (let i = 1; i < plan.weeks.length; i++) {
      expect(plan.weeks[i].startDay).toBe(addDays(plan.weeks[i - 1].endDay, 1));
    }
    const lastBefore = plan.weeks.filter((week) => !week.afterTarget).pop()!;
    expect(lastBefore.endDay).toBe(addDays(loss.targetDay!, -1));
  });

  it("к дате плановый вес приходит в цель", () => {
    const lastBefore = plan.weeks.filter((week) => !week.afterTarget).pop()!;
    expect(lastBefore.plannedWeightEnd).toBeCloseTo(74, 1);
  });

  it("вход мягче основного этапа, неделя на поддержании — на уровне расхода", () => {
    const entry = plan.weeks.find((week) => week.phase === "entry")!;
    const main = plan.weeks.find((week) => week.phase === "main")!;
    const pause = plan.weeks.find((week) => week.phase === "break")!;
    expect(entry.kcal).toBeGreaterThan(main.kcal);
    const maintenanceAtBreak = maintenanceKcal({ ...loss, weightKg: pause.plannedWeightStart });
    expect(Math.abs(pause.kcal - maintenanceAtBreak)).toBeLessThanOrEqual(10);
  });

  it("держит пределы безопасности", () => {
    expect(plan.summary.weeklyRateKg).toBeLessThanOrEqual(0.74);
    expect(plan.weeks.every((week) => week.kcal >= kcalFloor("male"))).toBe(true);
    expect(plan.summary.dailyDeltaKcal).toBeLessThanOrEqual(0.25 * maintenanceKcal({ ...loss, weightKg: 74 }));
  });
});

describe("buildProgram: отказы вместо опасной программы", () => {
  it("слишком быстрая цель — отказ и реальная дата, по которой программа строится", () => {
    const fast = buildProgram({ ...loss, targetWeightKg: 70, targetDay: addDays(START, 28) });
    expect(fast.ok).toBe(false);
    if (fast.ok) return;
    expect(fast.problem.code).toBe("too_fast");
    expect(fast.problem.suggestedTargetDay).toBeTruthy();
    const suggested = fast.problem.suggestedTargetDay!;
    expect(buildProgram({ ...loss, targetWeightKg: 70, targetDay: suggested }).ok).toBe(true);
    // Подсказка — действительно ближайшая: ни один день между выбранной и подсказанной датой не строится.
    for (let day = addDays(START, 29); day < suggested; day = addDays(day, 1)) {
      expect(buildProgram({ ...loss, targetWeightKg: 70, targetDay: day }).ok).toBe(false);
    }
  });

  it("слишком близкая дата — отказ с подсказкой", () => {
    const short = buildProgram({ ...loss, targetDay: addDays(START, 10) });
    expect(short.ok).toBe(false);
    if (short.ok) return;
    expect(short.problem.code).toBe("too_short");
    expect(buildProgram({ ...loss, targetDay: short.problem.suggestedTargetDay! }).ok).toBe(true);
  });

  it("до 18 лет — только удержание", () => {
    const teen = buildProgram({ ...loss, age: 16 });
    expect(!teen.ok && teen.problem.code).toBe("age");
    expect(buildProgram({ ...loss, age: 16, goal: "maintain", targetDay: null }).ok).toBe(true);
  });

  it("цель ниже здорового веса — отказ с минимумом", () => {
    const thin = buildProgram({ ...loss, sex: "female", heightCm: 160, startWeightKg: 60, targetWeightKg: 45, targetDay: addDays(START, 40 * 7) });
    expect(!thin.ok && thin.problem.code).toBe("target_underweight");
    expect(!thin.ok && thin.problem.minTargetWeightKg).toBe(47.4);
  });

  it("цель не в ту сторону и слишком маленькая разница", () => {
    expect(buildProgram({ ...loss, targetWeightKg: 82 }).ok).toBe(false);
    const tiny = buildProgram({ ...loss, targetWeightKg: 79.5 });
    expect(!tiny.ok && tiny.problem.code).toBe("too_small");
  });

  it("без анкеты и без даты программа не строится", () => {
    expect(buildProgram({ ...loss, heightCm: 0 }).ok).toBe(false);
    const noDate = buildProgram({ ...loss, targetDay: null });
    expect(!noDate.ok && noDate.problem.code).toBe("date");
  });

  it("дата дальше полутора лет — отказ", () => {
    const far = buildProgram({ ...loss, targetDay: addDays(START, 80 * 7) });
    expect(!far.ok && far.problem.code).toBe("too_long");
  });
});

describe("buildProgram: набор и удержание", () => {
  it("набор не быстрее 0,5% веса в неделю и с профицитом не больше 15%", () => {
    const gain = okPlan(buildProgram({ ...loss, goal: "gain", startWeightKg: 60, targetWeightKg: 64, targetDay: addDays(START, 26 * 7) }));
    expect(gain.summary.weeklyRateKg).toBeLessThanOrEqual(0.3);
    expect(gain.summary.dailyDeltaKcal).toBeLessThanOrEqual(0.15 * maintenanceKcal({ ...loss, weightKg: 60 }));
    const main = gain.weeks.find((week) => week.phase === "main")!;
    expect(main.kcal).toBeGreaterThan(maintenanceKcal({ ...loss, weightKg: main.plannedWeightStart }));
  });

  it("удержание без даты — 12 недель на уровне расхода, вес не меняется", () => {
    const keep = okPlan(buildProgram({ ...loss, goal: "maintain", targetWeightKg: 0, targetDay: null }));
    expect(keep.weeks).toHaveLength(12);
    expect(keep.weeks.every((week) => week.phase === "main" && week.plannedWeightEnd === 80)).toBe(true);
    expect(keep.summary.targetWeightKg).toBe(80);
  });
});

describe("каталог — единственный источник правил", () => {
  it("правило, добавленное только в каталог, подхватывается расчётом", () => {
    const custom: ProgramCatalog = structuredClone(CURRENT_PROGRAM_CATALOG);
    custom.version = "test";
    custom.goals.loss.breakEvery = 4;
    custom.goals.loss.phases.hold = { title: "Выход", about: "тест", energyShare: 0 };
    custom.goals.loss.holdWeeks = 3;
    const plan = okPlan(buildProgram(loss, custom));
    expect(plan.catalogVersion).toBe("test");
    expect(plan.weeks.filter((week) => week.phase === "break").length).toBeGreaterThan(1);
    expect(plan.weeks.filter((week) => week.afterTarget)).toHaveLength(3);
    expect(plan.phases.at(-1)?.title).toBe("Выход");
  });

  it("сохранённое расписание читается обратно без потерь — сайт и бот видят одно и то же", () => {
    const plan = okPlan(buildProgram(loss));
    // Как в базе: объект проходит через JSON (jsonb).
    const json = JSON.parse(JSON.stringify(storedPlan(plan)));
    const row = { goal_kind: "loss", start_day: START, target_day: loss.targetDay, start_weight_kg: "80.0", target_weight_kg: "74.0", catalog_version: "v1", inputs: {}, plan: json };
    expect(planFromRow(row)).toEqual(plan);
  });

  it("испорченное или неполное расписание — null, а не подмена", () => {
    const plan = okPlan(buildProgram(loss));
    const base = { goal_kind: "loss", start_day: START, target_day: loss.targetDay, start_weight_kg: 80, target_weight_kg: 74, catalog_version: "v1", inputs: {} };
    const broken = JSON.parse(JSON.stringify(storedPlan(plan)));
    broken.weeks[3].kcal = "много";
    expect(planFromRow({ ...base, plan: broken })).toBeNull();
    expect(planFromRow({ ...base, plan: { ...storedPlan(plan), weeks: [] } })).toBeNull();
    expect(planFromRow({ ...base, plan: { weeks: plan.weeks, phases: plan.phases } })).toBeNull();
    expect(planFromRow({ ...base, plan: null })).toBeNull();
    expect(planFromRow({ ...base, goal_kind: "boom", plan: storedPlan(plan) })).toBeNull();
  });
});

describe("buildProgram: свойства на всём диапазоне дат", () => {
  const profiles: ProgramInput[] = [
    { ...loss, startWeightKg: 80, targetWeightKg: 73.4 },
    { ...loss, sex: "female", age: 35, heightCm: 165, activityLevel: "light", startWeightKg: 75, targetWeightKg: 72 },
    { ...loss, sex: "female", age: 45, heightCm: 160, activityLevel: "low", startWeightKg: 70, targetWeightKg: 68.3 },
    { ...loss, startWeightKg: 120, targetWeightKg: 78 },
    { ...loss, goal: "gain", startWeightKg: 60, targetWeightKg: 66 },
  ];

  it("если строится дата D, строится и любая дата позже", () => {
    for (const profile of profiles) {
      let firstOk: number | null = null;
      for (let days = 28; days <= 78 * 7; days++) {
        const ok = buildProgram({ ...profile, targetDay: addDays(START, days) }).ok;
        if (ok && firstOk == null) firstOk = days;
        if (firstOk != null) expect({ days, ok }).toEqual({ days, ok: true });
      }
      expect(firstOk).not.toBeNull();
    }
  });

  it("сумма БЖУ не больше калорий недели — и у крупных людей", () => {
    const heavy: ProgramInput = { ...loss, sex: "female", age: 40, heightCm: 165, activityLevel: "low", startWeightKg: 140, targetWeightKg: 125, targetDay: null };
    const first = buildProgram({ ...heavy, targetDay: addDays(START, 28) });
    const day = !first.ok && first.problem.suggestedTargetDay ? first.problem.suggestedTargetDay : addDays(START, 52 * 7);
    for (const input of [{ ...heavy, targetDay: day }, loss, { ...profiles[3], targetDay: addDays(START, 78 * 7) }]) {
      const plan = buildProgram(input);
      if (!plan.ok) throw new Error(plan.problem.code);
      for (const week of plan.weeks) {
        expect(week.protein * 4 + week.fat * 9 + week.carb * 4).toBeLessThanOrEqual(week.kcal + 10);
      }
    }
  });

  it("вес вне 35–300 кг и расход ниже минимума — понятный отказ, а не «заполни анкету»", () => {
    const big = buildProgram({ ...loss, startWeightKg: 310, targetWeightKg: 280 });
    expect(!big.ok && big.problem.code).toBe("weight_range");
    const small = buildProgram({ ...loss, goal: "gain", sex: "female", age: 67, heightCm: 142, activityLevel: "low", startWeightKg: 46.5, targetWeightKg: 49, targetDay: addDays(START, 52 * 7) });
    expect(!small.ok && small.problem.code).toBe("low_energy");
  });

  it("в тексте отказа нет двойной точки", () => {
    const fast = buildProgram({ ...loss, targetWeightKg: 70, targetDay: addDays(START, 28) });
    expect(!fast.ok && fast.problem.message.includes("..")).toBe(false);
  });
});

describe("план против факта", () => {
  const plan = okPlan(buildProgram(loss));
  const [w1, w2, w3, w4] = plan.weeks;

  function facts(entries: ([string, number] | [string, number, number])[]) {
    return new Map<string, DayFact>(entries.map(([day, kcal, meals]) => [day, { kcal, meals: meals ?? 3 }]));
  }

  it("различает «в плане», «нет записей», «мало данных» и будущее", () => {
    const today = addDays(w4.startDay, 2);
    const data = facts([
      ...Array.from({ length: 7 }, (_, i) => [addDays(w1.startDay, i), w1.kcal] as [string, number]),
      [addDays(w3.startDay, 0), w3.kcal],
      [addDays(w3.startDay, 1), w3.kcal],
      [addDays(w4.startDay, 0), w4.kcal * 1.5],
      [addDays(w4.startDay, 1), w4.kcal * 1.5],
      [today, 100],
    ]);
    const reviews = reviewWeeks(plan, data, [], today);
    expect(reviews[0].adherence).toBe("on_plan");
    expect(reviews[1].adherence).toBe("no_data");
    expect(reviews[2].adherence).toBe("little_data");
    expect(reviews[3].status).toBe("current");
    expect(reviews[3].consideredDays).toBe(2);
    expect(reviews[3].adherence).toBe("off_plan");
    expect(reviews[4].status).toBe("future");
    expect(reviews[4].adherence).toBeNull();
    expect(w2).toBeDefined();
  });

  it("неполный день не тянет среднее вниз", () => {
    const data = facts([
      ...Array.from({ length: 6 }, (_, i) => [addDays(w1.startDay, i), w1.kcal] as [string, number]),
      [addDays(w1.startDay, 6), 150, 1],
    ]);
    const [review] = reviewWeeks(plan, data, [], addDays(w1.endDay, 1));
    expect(review.partialDays).toBe(1);
    expect(review.loggedDays).toBe(6);
    expect(review.avgKcal).toBe(w1.kcal);
  });

  it("сравнивает вес с плановой линией", () => {
    const today = addDays(w2.endDay, 1);
    const reviews = reviewWeeks(plan, new Map(), [
      { day: w1.endDay, kg: w1.plannedWeightEnd },
      { day: w2.endDay, kg: w2.plannedWeightEnd + 1.5 },
    ], today);
    expect(reviews[0].weightState).toBe("on_track");
    expect(reviews[1].weightState).toBe("behind");
    expect(reviews[2].weightState).toBe("unknown");
  });

  it("две недели без записей — подсказка пересобрать, программа сама ничего не меняет", () => {
    const today = addDays(w2.endDay, 1);
    const signals = programSignals(plan, reviewWeeks(plan, new Map(), [], today), today);
    expect(signals.map((signal) => signal.code)).toEqual(["rebuild_gap"]);
  });

  it("вес отстаёт при питании в плане — подсказка пересобрать", () => {
    const today = addDays(w2.endDay, 1);
    const data = facts([
      ...Array.from({ length: 7 }, (_, i) => [addDays(w1.startDay, i), w1.kcal] as [string, number]),
      ...Array.from({ length: 7 }, (_, i) => [addDays(w2.startDay, i), w2.kcal] as [string, number]),
    ]);
    const weights = [
      { day: w1.endDay, kg: w1.plannedWeightEnd + 1.2 },
      { day: w2.endDay, kg: w2.plannedWeightEnd + 1.5 },
    ];
    const signals = programSignals(plan, reviewWeeks(plan, data, weights, today), today);
    expect(signals.map((signal) => signal.code)).toEqual(["behind_track"]);
  });

  it("недоедание видно как «мимо плана», а не «мало записей», и даёт предупреждение", () => {
    const today = addDays(w1.endDay, 1);
    const data = facts(Array.from({ length: 7 }, (_, i) => [addDays(w1.startDay, i), 600, 3] as [string, number, number]));
    const reviews = reviewWeeks(plan, data, [], today);
    expect(reviews[0].adherence).toBe("off_plan");
    expect(reviews[0].lowDays).toBe(7);
    expect(programSignals(plan, reviews, today)[0].code).toBe("under_floor");
  });

  it("вес уходит быстрее плана две недели — предупреждение, а не похвала", () => {
    const today = addDays(w2.endDay, 1);
    const weights = [
      { day: w1.endDay, kg: w1.plannedWeightEnd - 1.2 },
      { day: w2.endDay, kg: w2.plannedWeightEnd - 1.5 },
    ];
    expect(programSignals(plan, reviewWeeks(plan, new Map(), weights, today), today).map((signal) => signal.code)).toContain("too_fast");
  });

  it("целевой вес достигнут раньше срока — подсказка завершить и перейти на удержание", () => {
    const today = addDays(w3.endDay, 1);
    const signals = programSignals(plan, reviewWeeks(plan, new Map(), [{ day: w3.endDay, kg: 73.8 }], today), today);
    expect(signals.map((signal) => signal.code)).toContain("goal_reached");
  });

  it("в день цели — уже закрепление, после последней недели — завершение", () => {
    const onTarget = loss.targetDay!;
    expect(programSignals(plan, reviewWeeks(plan, new Map(), [], onTarget), onTarget).map((signal) => signal.code)).toContain("past_target");
    const afterTarget = addDays(loss.targetDay!, 1);
    expect(programSignals(plan, reviewWeeks(plan, new Map(), [], afterTarget), afterTarget).map((signal) => signal.code)).toContain("past_target");
    const afterEnd = addDays(plan.summary.endDay, 1);
    expect(programSignals(plan, reviewWeeks(plan, new Map(), [], afterEnd), afterEnd).map((signal) => signal.code)).toEqual(["finished"]);
  });
});
