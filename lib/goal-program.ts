// Программа к цели по дате — аналог «плана к старту» у платформ подготовки
// к соревнованиям: человек выбирает цель и дату, программа считает недели до
// даты, раскладывает их по этапам и даёт ориентиры КБЖУ на каждую неделю.
//
// Всё считается здесь, детерминированно и без AI. В базе хранится только выбор
// человека и снимок анкеты (таблица nutrition_programs), а недели и ориентиры
// каждый раз выводятся из них по правилам каталога. Второй копии плана нет:
// иначе сайт, бот и база разойдутся. Правила меняются только новой версией
// каталога — старые программы продолжают считаться по своей.

import { kcalFloor, macroTargets, maintenanceKcal, type ActivityLevel } from "@/lib/client-setup";

// Энергия 1 кг массы тела. Упрощение: для набора часть прибавки — мышцы,
// им нужно меньше энергии, поэтому предел профицита в каталоге ниже.
export const KCAL_PER_KG = 7700;
const KCAL_CEILING = 6000;

export type ProgramGoal = "loss" | "gain" | "maintain";
export type PhaseCode = "entry" | "main" | "break" | "hold";

export const GOAL_LABELS: Record<ProgramGoal, string> = {
  loss: "Снижение веса",
  gain: "Набор массы",
  maintain: "Поддержание",
};

export function programGoalFromLabel(value: unknown): ProgramGoal | null {
  const s = String(value || "").toLowerCase();
  if (s.includes("loss") || s.includes("сниж") || s.includes("похуд")) return "loss";
  if (s.includes("gain") || s.includes("набор")) return "gain";
  if (s.includes("maint") || s.includes("поддерж")) return "maintain";
  return null;
}

export type PhaseRule = {
  title: string;
  about: string;
  // Доля рабочего дефицита (или профицита): 1 — полный, 0.5 — половина, 0 — калории на поддержание.
  energyShare: number;
};

export type GoalRule = {
  phases: Partial<Record<PhaseCode, PhaseRule>> & { main: PhaseRule };
  entryWeeks: number;
  // Через сколько недель основного этапа вставлять неделю на поддержании.
  breakEvery: number | null;
  // Сколько недель закрепления после даты цели.
  holdWeeks: number;
  // Пределы безопасности: скорость в % веса за неделю и доля от расхода.
  maxWeeklyRatePct: number;
  maxEnergyShare: number;
  minWeeks: number;
  maxWeeks: number;
  // Срок по умолчанию, если дата необязательна (удержание).
  defaultWeeks: number;
};

export type ProgramCatalog = {
  version: string;
  goals: Record<ProgramGoal, GoalRule>;
};

export const PROGRAM_CATALOG_V1: ProgramCatalog = {
  version: "v1",
  goals: {
    loss: {
      phases: {
        entry: {
          title: "Мягкий вход",
          about: "Половина рабочего дефицита: привычки и аппетит подстраиваются без стресса.",
          energyShare: 0.5,
        },
        main: {
          title: "Основной этап",
          about: "Рабочий дефицит — здесь уходит основной вес.",
          energyShare: 1,
        },
        break: {
          title: "Неделя на поддержании",
          about: "Калории на уровне расхода: снимает усталость от дефицита и помогает сохранить мышцы.",
          energyShare: 0,
        },
        hold: {
          title: "Закрепление",
          about: "После даты — калории на поддержание нового веса, чтобы результат не откатился.",
          energyShare: 0,
        },
      },
      entryWeeks: 2,
      breakEvery: 8,
      holdWeeks: 2,
      maxWeeklyRatePct: 1,
      maxEnergyShare: 0.25,
      minWeeks: 4,
      maxWeeks: 78,
      defaultWeeks: 12,
    },
    gain: {
      phases: {
        entry: {
          title: "Мягкий вход",
          about: "Половина рабочего профицита: аппетит и пищеварение привыкают к большему объёму.",
          energyShare: 0.5,
        },
        main: {
          title: "Основной набор",
          about: "Рабочий профицит: стабильная прибавка без лишнего жира.",
          energyShare: 1,
        },
        hold: {
          title: "Закрепление",
          about: "После даты — калории на поддержание нового веса.",
          energyShare: 0,
        },
      },
      entryWeeks: 2,
      breakEvery: null,
      holdWeeks: 2,
      maxWeeklyRatePct: 0.5,
      maxEnergyShare: 0.15,
      minWeeks: 4,
      maxWeeks: 78,
      defaultWeeks: 12,
    },
    maintain: {
      phases: {
        main: {
          title: "Удержание",
          about: "Калории на уровне расхода, вес держится в коридоре ±1,5%.",
          energyShare: 0,
        },
      },
      entryWeeks: 0,
      breakEvery: null,
      holdWeeks: 0,
      maxWeeklyRatePct: 0,
      maxEnergyShare: 0,
      minWeeks: 4,
      maxWeeks: 78,
      defaultWeeks: 12,
    },
  },
};

export const PROGRAM_CATALOGS: Record<string, ProgramCatalog> = {
  [PROGRAM_CATALOG_V1.version]: PROGRAM_CATALOG_V1,
};
export const CURRENT_PROGRAM_CATALOG = PROGRAM_CATALOG_V1;

const ACTIVITY_LEVELS: readonly string[] = ["low", "light", "moderate", "high", "very_high"];

// Коридор удержания: отклонение от стартового веса, которое ещё считается нормой.
const MAINTAIN_BAND_PCT = 1.5;
const MIN_TARGET_BMI = 18.5;
const MIN_CHANGE_KG = 1;
// Белок и жир у людей с большим весом считаются от веса при этом ИМТ, иначе
// одни БЖУ не помещаются в калории программы и съедают дефицит.
const MACRO_REFERENCE_BMI = 27;

export type ProgramInput = {
  goal: ProgramGoal;
  sex: "male" | "female";
  age: number;
  heightCm: number;
  activityLevel: ActivityLevel;
  startWeightKg: number;
  targetWeightKg: number;
  startDay: string;
  targetDay: string | null;
};

export type ProgramWeek = {
  index: number;
  startDay: string;
  endDay: string;
  days: number;
  phase: PhaseCode;
  title: string;
  afterTarget: boolean;
  kcal: number;
  protein: number;
  fat: number;
  carb: number;
  plannedWeightStart: number;
  plannedWeightEnd: number;
};

export type ProgramPhaseSpan = {
  phase: PhaseCode;
  title: string;
  about: string;
  startDay: string;
  endDay: string;
  weeks: number;
};

export type ProblemCode =
  | "profile"
  | "weight_range"
  | "low_energy"
  | "age"
  | "target_range"
  | "target_underweight"
  | "direction"
  | "too_small"
  | "date"
  | "too_short"
  | "too_long"
  | "too_fast";

export type ProgramProblem = {
  code: ProblemCode;
  message: string;
  suggestedTargetDay?: string;
  minTargetWeightKg?: number;
};

export type ProgramPlan =
  | {
      ok: true;
      goal: ProgramGoal;
      catalogVersion: string;
      weeks: ProgramWeek[];
      phases: ProgramPhaseSpan[];
      summary: {
        startDay: string;
        targetDay: string;
        endDay: string;
        startWeightKg: number;
        targetWeightKg: number;
        totalChangeKg: number;
        maintenanceKcal: number;
        dailyDeltaKcal: number;
        weeklyRateKg: number;
        kcalFloor: number;
      };
    }
  | { ok: false; problem: ProgramProblem };

// --- даты: строки ГГГГ-ММ-ДД, арифметика в UTC, чтобы не зависеть от пояса сервера ---

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
function toUtc(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}
export function isDay(value: unknown): value is string {
  if (typeof value !== "string" || !DAY_RE.test(value)) return false;
  return new Date(toUtc(value)).toISOString().slice(0, 10) === value;
}
export function addDays(day: string, n: number) {
  return new Date(toUtc(day) + n * 86400000).toISOString().slice(0, 10);
}
export function daysBetween(from: string, to: string) {
  return Math.round((toUtc(to) - toUtc(from)) / 86400000);
}

const round1 = (value: number) => Math.round(value * 10) / 10;
const round10 = (value: number) => Math.round(value / 10) * 10;

type Slot = { phase: PhaseCode; days: number };
type LayoutVariant = { entryWeeks: number; breaks: boolean };

// Раскладка дней до даты по неделям и этапам. Последняя неделя — от 4 до 10 дней,
// чтобы не было «недели» из одного-двух дней.
function layout(rule: GoalRule, totalDays: number, variant: LayoutVariant): Slot[] {
  const count = Math.max(1, Math.round(totalDays / 7));
  const lengths = Array.from({ length: count }, (_, i) => (i < count - 1 ? 7 : totalDays - 7 * (count - 1)));
  const entry = rule.phases.entry ? Math.min(variant.entryWeeks, Math.floor(count / 4)) : 0;
  const slots: Slot[] = [];
  let mainRun = 0;
  for (let i = 0; i < count; i++) {
    if (i < entry) {
      slots.push({ phase: "entry", days: lengths[i] });
      continue;
    }
    const weeksLeft = count - i;
    if (variant.breaks && rule.phases.break && rule.breakEvery && mainRun >= rule.breakEvery && weeksLeft > 2) {
      slots.push({ phase: "break", days: lengths[i] });
      mainRun = 0;
      continue;
    }
    slots.push({ phase: "main", days: lengths[i] });
    mainRun++;
  }
  return slots;
}

// Вход и недели на поддержании — для удобства, безопасность задаёт только
// дефицит. Если с ними к дате безопасно не успеть, пробуем раскладку проще.
// Последний вариант — весь срок основным этапом: его полезный срок растёт с
// каждым днём, поэтому если строится дата D, строится и любая дата позже.
function layoutVariants(rule: GoalRule): LayoutVariant[] {
  const variants: LayoutVariant[] = [
    { entryWeeks: rule.entryWeeks, breaks: true },
    { entryWeeks: rule.entryWeeks, breaks: false },
    { entryWeeks: Math.min(1, rule.entryWeeks), breaks: false },
    { entryWeeks: 0, breaks: false },
  ];
  return variants.filter((v, i) => variants.findIndex((w) => w.entryWeeks === v.entryWeeks && w.breaks === v.breaks) === i);
}

function shareOf(rule: GoalRule, phase: PhaseCode) {
  return rule.phases[phase]?.energyShare ?? 0;
}

type Profile = Pick<ProgramInput, "sex" | "age" | "heightCm" | "activityLevel">;

function tdeeAt(profile: Profile, weightKg: number) {
  return maintenanceKcal({ ...profile, weightKg });
}

// Рабочий дефицит/профицит в ккал в день (при доле 1) и проверка пределов.
function energyFor(input: ProgramInput, rule: GoalRule, slots: Slot[]) {
  const changeKg = Math.abs(input.targetWeightKg - input.startWeightKg);
  const effectiveDays = slots.reduce((sum, slot) => sum + shareOf(rule, slot.phase) * slot.days, 0);
  if (effectiveDays <= 0) return { delta: 0, safe: false };
  const delta = (changeKg * KCAL_PER_KG) / effectiveDays;
  // Пределы проверяем по худшей точке программы: для снижения это конец (меньше
  // вес — меньше расход), для набора — начало.
  const lighterWeight = Math.min(input.startWeightKg, input.targetWeightKg);
  const tdeeLow = tdeeAt(input, lighterWeight);
  const weeklyRateKg = (delta * 7) / KCAL_PER_KG;
  const withinRate = weeklyRateKg <= (rule.maxWeeklyRatePct / 100) * lighterWeight + 1e-9;
  const withinShare = delta <= rule.maxEnergyShare * tdeeLow + 1e-9;
  const withinKcal = input.goal === "loss"
    ? tdeeLow - delta >= kcalFloor(input.sex)
    : tdeeAt(input, input.targetWeightKg) + delta <= KCAL_CEILING;
  return { delta, safe: withinRate && withinShare && withinKcal };
}

function safeLayout(input: ProgramInput, rule: GoalRule, totalDays: number) {
  if (input.goal === "maintain") return { slots: layout(rule, totalDays, layoutVariants(rule)[0]), delta: 0 };
  for (const variant of layoutVariants(rule)) {
    const slots = layout(rule, totalDays, variant);
    const energy = energyFor(input, rule, slots);
    if (energy.safe) return { slots, delta: energy.delta };
  }
  return null;
}

// Первый день после fromDays, к которому программа строится. Перебор по дням:
// подсказанная дата — действительно ближайшая.
function earliestSafeTargetDay(input: ProgramInput, rule: GoalRule, fromDays: number) {
  for (let days = Math.max(rule.minWeeks * 7, fromDays); days <= rule.maxWeeks * 7; days++) {
    if (safeLayout(input, rule, days)) return addDays(input.startDay, days);
  }
  return undefined;
}

function problem(code: ProblemCode, message: string, extra: Partial<ProgramProblem> = {}): ProgramPlan {
  return { ok: false, problem: { code, message, ...extra } };
}

export function formatDay(day: string, withYear = false) {
  return new Date(toUtc(day)).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });
}

// БЖУ недели. У людей с ИМТ до 27 — ровно как в анкете (macroTargets). Выше —
// белок и жир от веса при ИМТ 27, а если углеводам не остаётся места, жир
// снижается до 0,6 г/кг: сумма БЖУ не должна превышать калории программы.
export function programMacros(kcal: number, weightKg: number, heightCm: number, goalLabel: string) {
  const heightM = heightCm / 100;
  const reference = Math.min(weightKg, MACRO_REFERENCE_BMI * heightM * heightM);
  const macros = macroTargets(kcal, reference, goalLabel);
  if (macros.protein * 4 + macros.fat * 9 + macros.carb * 4 <= kcal + 5) return macros;
  const minFat = Math.round(reference * 0.6);
  const fat = Math.max(minFat, Math.floor((kcal - macros.protein * 4 - 80 * 4) / 9));
  const carb = Math.max(0, Math.round((kcal - macros.protein * 4 - fat * 9) / 4));
  return { protein: macros.protein, fat, carb };
}

export function buildProgram(input: ProgramInput, catalog: ProgramCatalog = CURRENT_PROGRAM_CATALOG): ProgramPlan {
  const rule = catalog.goals[input.goal];
  const label = GOAL_LABELS[input.goal];
  const profileOk = ["male", "female"].includes(input.sex)
    && ACTIVITY_LEVELS.includes(input.activityLevel)
    && input.age >= 14 && input.age <= 100
    && input.heightCm >= 120 && input.heightCm <= 230
    && input.startWeightKg > 0
    && Boolean(rule) && isDay(input.startDay);
  if (!profileOk) {
    return problem("profile", "Чтобы построить программу, заполни анкету: пол, возраст, рост, активность и текущий вес.");
  }
  if (input.startWeightKg < 35 || input.startWeightKg > 300) {
    return problem("weight_range", "Программа рассчитана на вес от 35 до 300 кг. При другом весе питание лучше подбирать вместе с врачом.");
  }

  if (input.goal !== "maintain" && input.age < 18) {
    return problem("age", "До 18 лет программа на снижение или набор веса не строится: менять вес в этом возрасте стоит вместе с врачом. Доступна программа удержания.");
  }

  const floor = kcalFloor(input.sex);
  if (input.goal !== "loss" && tdeeAt(input, input.startWeightKg) < floor) {
    return problem("low_energy", `Расчётный расход ниже безопасного минимума ${floor} ккал. Набор или удержание по калориям в таком случае лучше подбирать вместе с врачом.`);
  }

  const target = input.goal === "maintain" ? input.startWeightKg : input.targetWeightKg;
  if (!Number.isFinite(target) || target < 35 || target > 300) {
    return problem("target_range", "Укажи целевой вес — от 35 до 300 кг.");
  }

  const heightM = input.heightCm / 100;
  const minHealthy = Math.ceil(MIN_TARGET_BMI * heightM * heightM * 10) / 10;
  if (input.goal === "loss" && target < minHealthy) {
    return problem(
      "target_underweight",
      `Целевой вес ниже здорового диапазона для твоего роста. Минимум для программы — ${minHealthy.toLocaleString("ru-RU")} кг.`,
      { minTargetWeightKg: minHealthy },
    );
  }

  if (input.goal === "loss" && target >= input.startWeightKg) {
    return problem("direction", "Для снижения целевой вес должен быть меньше текущего.");
  }
  if (input.goal === "gain" && target <= input.startWeightKg) {
    return problem("direction", "Для набора целевой вес должен быть больше текущего.");
  }
  if (input.goal !== "maintain" && Math.abs(target - input.startWeightKg) < MIN_CHANGE_KG) {
    return problem("too_small", "Разница меньше 1 кг — это задача удержания. Выбери цель «Поддержание».");
  }

  const normalized: ProgramInput = { ...input, targetWeightKg: target };
  let targetDay = input.targetDay;
  if (!targetDay && input.goal === "maintain") targetDay = addDays(input.startDay, rule.defaultWeeks * 7);
  if (!isDay(targetDay)) {
    return problem("date", "Выбери дату, к которой хочешь прийти к цели.");
  }

  const totalDays = daysBetween(input.startDay, targetDay);
  if (totalDays < rule.minWeeks * 7) {
    const suggestion = input.goal === "maintain"
      ? addDays(input.startDay, rule.minWeeks * 7)
      : earliestSafeTargetDay(normalized, rule, rule.minWeeks * 7);
    return problem("too_short", `Слишком близкая дата: программе нужно минимум ${rule.minWeeks} недели.`, {
      suggestedTargetDay: suggestion,
    });
  }
  if (totalDays > rule.maxWeeks * 7) {
    return problem("too_long", "Дата дальше полутора лет. Поставь промежуточную цель ближе — после неё можно начать следующую программу.");
  }

  const chosen = safeLayout(normalized, rule, totalDays);
  if (!chosen) {
    const suggestion = earliestSafeTargetDay(normalized, rule, totalDays + 1);
    return problem(
      "too_fast",
      suggestion
        ? `К этой дате безопасно не успеть: понадобился бы слишком жёсткий ${input.goal === "loss" ? "дефицит" : "профицит"}. Ближайшая реальная дата — ${formatDay(suggestion, true)}`
        : "Цель слишком далека для безопасного темпа даже за полтора года. Поставь промежуточную цель.",
      { suggestedTargetDay: suggestion },
    );
  }

  const sign = input.goal === "loss" ? -1 : input.goal === "gain" ? 1 : 0;
  const allSlots: (Slot & { afterTarget: boolean })[] = [
    ...chosen.slots.map((slot) => ({ ...slot, afterTarget: false })),
    ...(rule.phases.hold
      ? Array.from({ length: rule.holdWeeks }, () => ({ phase: "hold" as const, days: 7, afterTarget: true }))
      : []),
  ];

  const weeks: ProgramWeek[] = [];
  let day = input.startDay;
  let weight = input.startWeightKg;
  for (const [i, slot] of allSlots.entries()) {
    const phaseRule = rule.phases[slot.phase]!;
    const delta = chosen.delta * phaseRule.energyShare;
    const tdee = tdeeAt(input, weight);
    const kcal = Math.min(KCAL_CEILING, Math.max(floor, round10(tdee + sign * delta)));
    const plannedEnd = slot.afterTarget ? weight : weight + (sign * delta * slot.days) / KCAL_PER_KG;
    const macros = programMacros(kcal, round1(weight), input.heightCm, label);
    weeks.push({
      index: i + 1,
      startDay: day,
      endDay: addDays(day, slot.days - 1),
      days: slot.days,
      phase: slot.phase,
      title: phaseRule.title,
      afterTarget: slot.afterTarget,
      kcal,
      ...macros,
      plannedWeightStart: round1(weight),
      plannedWeightEnd: round1(plannedEnd),
    });
    day = addDays(day, slot.days);
    weight = plannedEnd;
  }

  const phases: ProgramPhaseSpan[] = [];
  for (const week of weeks) {
    const last = phases[phases.length - 1];
    if (last && last.phase === week.phase) {
      last.endDay = week.endDay;
      last.weeks++;
    } else {
      const phaseRule = rule.phases[week.phase]!;
      phases.push({ phase: week.phase, title: phaseRule.title, about: phaseRule.about, startDay: week.startDay, endDay: week.endDay, weeks: 1 });
    }
  }

  return {
    ok: true,
    goal: input.goal,
    catalogVersion: catalog.version,
    weeks,
    phases,
    summary: {
      startDay: input.startDay,
      targetDay,
      endDay: weeks[weeks.length - 1].endDay,
      startWeightKg: input.startWeightKg,
      targetWeightKg: target,
      totalChangeKg: round1(target - input.startWeightKg),
      maintenanceKcal: round10(tdeeAt(input, input.startWeightKg)),
      dailyDeltaKcal: Math.round(chosen.delta),
      weeklyRateKg: round1((chosen.delta * 7) / KCAL_PER_KG),
      kcalFloor: floor,
    },
  };
}

// --- сохранённая программа → вход расчёта ---

export type ProgramRow = {
  goal_kind: string;
  start_day: string;
  target_day: string | null;
  start_weight_kg: number | string;
  target_weight_kg: number | string;
  catalog_version: string;
  inputs: Record<string, unknown> | null;
};

export function programInputFromRow(row: ProgramRow): ProgramInput | null {
  const goal = (["loss", "gain", "maintain"] as const).find((value) => value === row.goal_kind);
  const inputs = row.inputs || {};
  const activity = String(inputs.activity_level || "") as ActivityLevel;
  if (!goal || !ACTIVITY_LEVELS.includes(activity)) return null;
  return {
    goal,
    sex: inputs.sex === "female" ? "female" : "male",
    age: Number(inputs.age_years),
    heightCm: Number(inputs.height_cm),
    activityLevel: activity,
    startWeightKg: Number(row.start_weight_kg),
    targetWeightKg: Number(row.target_weight_kg),
    startDay: String(row.start_day).slice(0, 10),
    targetDay: row.target_day ? String(row.target_day).slice(0, 10) : null,
  };
}

// Сохранённая программа пересчитывается по той версии правил, по которой её
// создали. Неизвестная версия — null: показать ошибку, а не считать по чужим правилам.
export function planFromRow(row: ProgramRow): ProgramPlan | null {
  const catalog = PROGRAM_CATALOGS[row.catalog_version];
  const input = programInputFromRow(row);
  if (!catalog || !input) return null;
  return buildProgram(input, catalog);
}

// Ориентиры, которые должны стоять в профиле сегодня: неделя, в которую попал
// день; до старта — первая, после конца — последняя.
export function weekTargetsFor(plan: Extract<ProgramPlan, { ok: true }>, day: string) {
  const week = plan.weeks.find((item) => day >= item.startDay && day <= item.endDay)
    || (day < plan.weeks[0].startDay ? plan.weeks[0] : plan.weeks[plan.weeks.length - 1]);
  return { week, kcal: week.kcal, protein: week.protein, fat: week.fat, carb: week.carb };
}

// Анкета из client_settings + свежий вес → вход расчёта. Вес берётся из
// последнего измерения: его пишут и сайт, и бот, а current_weight_kg в
// настройках обновляет только сайт.
export function programInputFromSettings(
  settings: Record<string, unknown> | null | undefined,
  latestWeightKg: number | null,
  choice: { goal: ProgramGoal; targetWeightKg: number; targetDay: string | null },
  startDay: string,
): ProgramInput {
  const activity = String(settings?.activity_level || "") as ActivityLevel;
  return {
    goal: choice.goal,
    sex: settings?.sex === "female" ? "female" : settings?.sex === "male" ? "male" : ("" as "male"),
    age: Number(settings?.age_years || 0),
    heightCm: Number(settings?.height_cm || 0),
    activityLevel: activity,
    startWeightKg: round1(Number(latestWeightKg || settings?.current_weight_kg || 0)),
    targetWeightKg: choice.targetWeightKg,
    startDay,
    targetDay: choice.targetDay,
  };
}

// В анкете нет пола, возраста, роста или активности — программу не строим,
// а отправляем заполнить анкету. Активность «по умолчанию» не подставляем молча.
export function programProfileMissing(settings: Record<string, unknown> | null | undefined, latestWeightKg: number | null) {
  return !["male", "female"].includes(String(settings?.sex || ""))
    || !(Number(settings?.age_years) > 0)
    || !(Number(settings?.height_cm) > 0)
    || !ACTIVITY_LEVELS.includes(String(settings?.activity_level || ""))
    || !(Number(latestWeightKg || settings?.current_weight_kg || 0) > 0);
}

// --- план против факта ---

export type DayFact = { kcal: number; meals: number };
export type WeightFact = { day: string; kg: number };

export type WeekStatus = "past" | "current" | "future";
// «Нет записей» и «мало данных» — разные случаи: первое значит, что человек не
// вёл дневник, второе — что судить ещё рано.
export type Adherence = "no_data" | "little_data" | "on_plan" | "near_plan" | "off_plan";
export type WeightState = "unknown" | "ahead" | "on_track" | "behind" | "off_band";

export type WeekReview = {
  week: ProgramWeek;
  status: WeekStatus;
  consideredDays: number;
  loggedDays: number;
  partialDays: number;
  lowDays: number;
  avgKcal: number | null;
  adherence: Adherence | null;
  weightKg: number | null;
  plannedWeightKg: number | null;
  weightState: WeightState;
};

// Неполный день — одна-две записи и меньше этой доли от ориентира (записан
// один перекус): он не тянет вниз среднее. Три и больше записей — это полный
// день, даже если калорий мало: так видно недоедание, а не «мало данных».
const PARTIAL_DAY_SHARE = 0.35;
const PARTIAL_DAY_MAX_MEALS = 2;
// Столько полных дней за неделю ниже безопасного минимума — повод предупредить.
const LOW_DAYS_ALERT = 3;

export function reviewWeeks(
  plan: Extract<ProgramPlan, { ok: true }>,
  facts: Map<string, DayFact>,
  weights: WeightFact[],
  today: string,
): WeekReview[] {
  const sortedWeights = [...weights].sort((a, b) => a.day.localeCompare(b.day));
  return plan.weeks.map((week) => {
    const status: WeekStatus = today > week.endDay ? "past" : today >= week.startDay ? "current" : "future";
    if (status === "future") {
      return { week, status, consideredDays: 0, loggedDays: 0, partialDays: 0, lowDays: 0, avgKcal: null, adherence: null, weightKg: null, plannedWeightKg: null, weightState: "unknown" };
    }

    // Сегодняшний день ещё идёт — в оценку не входит.
    const lastDay = status === "past" ? week.endDay : addDays(today, -1);
    const consideredDays = Math.max(0, daysBetween(week.startDay, lastDay) + 1);
    let loggedDays = 0;
    let partialDays = 0;
    let lowDays = 0;
    let kcalSum = 0;
    for (let i = 0; i < consideredDays; i++) {
      const fact = facts.get(addDays(week.startDay, i));
      if (!fact || fact.meals <= 0) continue;
      if (fact.meals <= PARTIAL_DAY_MAX_MEALS && fact.kcal < week.kcal * PARTIAL_DAY_SHARE) {
        partialDays++;
        continue;
      }
      loggedDays++;
      kcalSum += fact.kcal;
      if (fact.kcal < plan.summary.kcalFloor) lowDays++;
    }
    const avgKcal = loggedDays ? Math.round(kcalSum / loggedDays) : null;
    let adherence: Adherence | null = null;
    if (consideredDays > 0) {
      if (!loggedDays && !partialDays) adherence = "no_data";
      else if (loggedDays < Math.min(3, consideredDays)) adherence = "little_data";
      else {
        const deviation = Math.abs((avgKcal || 0) - week.kcal) / week.kcal;
        adherence = deviation <= 0.1 ? "on_plan" : deviation <= 0.2 ? "near_plan" : "off_plan";
      }
    }

    const weightEnd = status === "past" ? week.endDay : today;
    const measured = sortedWeights.filter((item) => item.day >= week.startDay && item.day <= weightEnd).pop();
    let plannedWeightKg: number | null = null;
    let weightState: WeightState = "unknown";
    if (measured) {
      const progress = Math.min(1, (daysBetween(week.startDay, measured.day) + 1) / week.days);
      plannedWeightKg = round1(week.plannedWeightStart + (week.plannedWeightEnd - week.plannedWeightStart) * progress);
      if (plan.goal === "maintain") {
        const band = (plan.summary.startWeightKg * MAINTAIN_BAND_PCT) / 100;
        weightState = Math.abs(measured.kg - plan.summary.startWeightKg) <= band ? "on_track" : "off_band";
      } else {
        const tolerance = Math.max(0.5, plannedWeightKg * 0.006);
        const diff = (measured.kg - plannedWeightKg) * (plan.goal === "loss" ? -1 : 1);
        weightState = diff > tolerance ? "ahead" : diff < -tolerance ? "behind" : "on_track";
      }
    }

    return { week, status, consideredDays, loggedDays, partialDays, lowDays, avgKcal, adherence, weightKg: measured ? measured.kg : null, plannedWeightKg, weightState };
  });
}

export type ProgramSignal = {
  code: "under_floor" | "too_fast" | "goal_reached" | "rebuild_gap" | "behind_track" | "off_plan_streak" | "past_target" | "finished";
  tone: "warn" | "info";
  title: string;
  text: string;
};

// Правила адаптации. Программа сама ничего не меняет — только подсказывает,
// а пересобрать или завершить решает человек. Предупреждения о здоровье — первыми.
export function programSignals(plan: Extract<ProgramPlan, { ok: true }>, reviews: WeekReview[], today: string): ProgramSignal[] {
  const signals: ProgramSignal[] = [];
  if (today > plan.summary.endDay) {
    signals.push({ code: "finished", tone: "info", title: "Программа завершена", text: "Все этапы пройдены. Заверши программу и начни следующую — от текущего веса." });
    return signals;
  }

  const recent = reviews.filter((review) => review.status !== "future").slice(-2);
  if (recent.some((review) => review.lowDays >= LOW_DAYS_ALERT)) {
    signals.push({
      code: "under_floor",
      tone: "warn",
      title: "Слишком мало еды",
      text: `Несколько дней подряд калорий меньше безопасного минимума ${plan.summary.kcalFloor} ккал. Так уходят мышцы, а не жир, и растёт риск срыва. Ешь ближе к ориентиру недели — программа уже учитывает нужный дефицит.`,
    });
  }

  const past = reviews.filter((review) => review.status === "past" && !review.week.afterTarget);
  const lastTwo = past.slice(-2);
  if (plan.goal !== "maintain" && lastTwo.length === 2 && lastTwo.every((review) => review.weightState === "ahead")) {
    signals.push({
      code: "too_fast",
      tone: "warn",
      title: plan.goal === "loss" ? "Вес уходит быстрее плана" : "Вес растёт быстрее плана",
      text: plan.goal === "loss"
        ? "Две недели подряд снижение быстрее безопасного темпа программы. Ешь ближе к ориентиру — быстрая потеря веса съедает мышцы и чаще возвращается."
        : "Две недели подряд прибавка быстрее плана — значит, набирается лишний жир. Ешь ближе к ориентиру недели.",
    });
  }

  const lastWeight = [...reviews].reverse().find((review) => review.weightKg != null)?.weightKg ?? null;
  const reached = lastWeight != null && (
    (plan.goal === "loss" && lastWeight <= plan.summary.targetWeightKg)
    || (plan.goal === "gain" && lastWeight >= plan.summary.targetWeightKg)
  );
  if (reached && today < plan.summary.targetDay) {
    signals.push({ code: "goal_reached", tone: "info", title: "Целевой вес достигнут", text: "Цель пришла раньше срока. Заверши программу и начни удержание, чтобы закрепить результат." });
  }

  if (today >= plan.summary.targetDay) {
    signals.push({ code: "past_target", tone: "info", title: "Дата цели наступила", text: "Идёт закрепление: калории на поддержание нового веса, чтобы результат не откатился." });
  }

  if (lastTwo.length === 2 && lastTwo.every((review) => review.adherence === "no_data")) {
    signals.push({ code: "rebuild_gap", tone: "warn", title: "Две недели без записей", text: "План уже не совпадает с реальностью. Пересобери программу от текущего веса — даты и ориентиры пересчитаются." });
  } else if (lastTwo.length === 2 && lastTwo.every((review) => review.weightState === "behind" && (review.adherence === "on_plan" || review.adherence === "near_plan"))) {
    signals.push({ code: "behind_track", tone: "warn", title: "Вес отстаёт, хотя питание в плане", text: "Похоже, реальный расход ниже расчётного. Запиши вес и пересобери программу — ориентиры пересчитаются от текущего веса." });
  } else if (lastTwo.length === 2 && lastTwo.every((review) => review.adherence === "off_plan")) {
    signals.push({ code: "off_plan_streak", tone: "warn", title: "Две недели далеко от плана", text: "Если ориентиры слишком жёсткие, лучше сдвинуть дату цели, чем срываться. Пересобери программу с более поздней датой." });
  }
  return signals;
}

export function weekForDay(plan: Extract<ProgramPlan, { ok: true }>, day: string) {
  return plan.weeks.find((week) => day >= week.startDay && day <= week.endDay) || null;
}
