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

// Тексты без давления и без внутренних терминов: человек сам решает,
// прижился дневник или нет. Цифры лимитов названы прямо, чтобы разница
// между «до» и «после» была видна без похода на сайт.
export function trialNoticeText(notice: Pick<TrialNotice, "kind" | "display_name" | "days_left">) {
  const name = String(notice.display_name || "").trim().split(/\s+/)[0];
  const hello = name ? `${name}, ` : "";

  if (notice.kind === "trial_ended") {
    return [
      "Пробный период закончился.",
      "",
      `${hello}дневник, КБЖУ и статистика работают как прежде — остаётся 10 фото и 10 вопросов AI в месяц.`,
      "",
      "Basic снимает этот потолок: 40 фото и 20 вопросов. Если считаешь питание каждый день, его хватает с запасом.",
    ].join("\n");
  }

  const days = Math.max(1, Math.trunc(Number(notice.days_left) || 1));
  return [
    `⏳ Пробный период заканчивается через ${days} ${pluralDays(days)}.`,
    "",
    `${hello}сейчас у тебя 40 фото и 20 вопросов AI в месяц. После окончания останется 10 и 10.`,
    "",
    "Если дневник прижился — продли доступ, и ничего не изменится.",
  ].join("\n");
}
