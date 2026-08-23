export type TrialNotice = {
  account_id: string;
  chat_id: number;
  display_name: string | null;
  kind: "trial_ending" | "trial_ended";
  ends_at: string;
  days_left: number;
};

// «1 день», «2 дня», «5 дней», «11 дней» — правило легко перепутать,
// поэтому оно вынесено отдельно и покрыто тестом.
export function pluralDays(days: number) {
  const value = Math.abs(Math.trunc(days));
  const tail = value % 100;
  if (tail >= 11 && tail <= 14) return "дней";
  switch (value % 10) {
    case 1: return "день";
    case 2:
    case 3:
    case 4: return "дня";
    default: return "дней";
  }
}

// Цифры и цена берутся из базы, а не из текста: лимиты живут в
// subscription_products и subscription_plan_limits_v1, и если владелец их
// поменяет, сообщение обязано измениться вместе с ними. Значения по умолчанию
// равны сегодняшним — если справочник не прочитался, человек всё равно получит
// корректное письмо, а не пустоту.
export type TrialPlanFacts = {
  priceRub: number;
  photoLimit: number;
  aiLimit: number;
  freePhotoLimit: number;
  freeAiLimit: number;
};

export const DEFAULT_TRIAL_PLAN_FACTS: TrialPlanFacts = {
  priceRub: 990,
  photoLimit: 40,
  aiLimit: 20,
  freePhotoLimit: 10,
  freeAiLimit: 10,
};

// Пробел неразрывный: «990 ₽» не должно переноситься на другую строку.
function money(rub: number) {
  return `${Math.round(rub).toLocaleString("ru-RU").replace(/ /g, " ")} ₽`;
}

// Тексты без давления и без внутренних терминов: человек сам решает,
// прижился дневник или нет. Цифры лимитов названы прямо, чтобы разница
// между «до» и «после» была видна без похода на сайт.
export function trialNoticeText(
  notice: Pick<TrialNotice, "kind" | "display_name" | "days_left">,
  facts: Partial<TrialPlanFacts> = {},
) {
  const f = { ...DEFAULT_TRIAL_PLAN_FACTS, ...facts };
  const name = String(notice.display_name || "").trim().split(/\s+/)[0];
  const hello = name ? `${name}, ` : "";

  if (notice.kind === "trial_ended") {
    return [
      "Пробный период закончился.",
      "",
      `${hello}дневник, КБЖУ и статистика работают как прежде — остаётся ${f.freePhotoLimit} фото и ${f.freeAiLimit} вопросов AI в месяц.`,
      "",
      `Basic — ${money(f.priceRub)} в месяц: ${f.photoLimit} фото и ${f.aiLimit} вопросов. Если считаешь питание каждый день, его хватает с запасом.`,
    ].join("\n");
  }

  const days = Math.max(1, Math.trunc(Number(notice.days_left) || 1));
  return [
    `⏳ Пробный период заканчивается через ${days} ${pluralDays(days)}.`,
    "",
    `${hello}сейчас у тебя ${f.photoLimit} фото и ${f.aiLimit} вопросов AI в месяц. После окончания останется ${f.freePhotoLimit} и ${f.freeAiLimit}.`,
    "",
    `Если дневник прижился — Basic стоит ${money(f.priceRub)} в месяц, и ничего не изменится.`,
  ].join("\n");
}
