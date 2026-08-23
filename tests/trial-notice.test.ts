import { describe, expect, it } from "vitest";
import { pluralDays, trialNoticeText } from "@/lib/trial-notice";

describe("pluralDays", () => {
  it("склоняет дни по русскому правилу", () => {
    expect(pluralDays(1)).toBe("день");
    expect(pluralDays(2)).toBe("дня");
    expect(pluralDays(4)).toBe("дня");
    expect(pluralDays(5)).toBe("дней");
    expect(pluralDays(0)).toBe("дней");
  });

  it("не спотыкается на 11–14, где правило меняется", () => {
    for (const days of [11, 12, 13, 14, 111, 112]) {
      expect(pluralDays(days)).toBe("дней");
    }
    expect(pluralDays(21)).toBe("день");
    expect(pluralDays(22)).toBe("дня");
  });
});

describe("trialNoticeText", () => {
  it("предупреждает за несколько дней и называет обе цифры лимита", () => {
    const text = trialNoticeText({ kind: "trial_ending", display_name: "Julie Vikhrova", days_left: 3 });
    expect(text).toContain("через 3 дня");
    expect(text).toContain("Julie,");
    expect(text).toContain("40 фото и 20 вопросов");
    expect(text).toContain("останется 10 и 10");
  });

  it("объясняет, что изменилось, когда бета уже закончилась", () => {
    const text = trialNoticeText({ kind: "trial_ended", display_name: "Надя", days_left: 0 });
    expect(text).toContain("Пробный период закончился");
    expect(text).toContain("Надя,");
    expect(text).toContain("10 фото и 10 вопросов");
    // Дневник продолжает работать — это главное, что человек должен понять.
    expect(text).toContain("работают как прежде");
  });

  it("обходится без имени, если его нет", () => {
    const text = trialNoticeText({ kind: "trial_ending", display_name: null, days_left: 1 });
    expect(text).toContain("через 1 день");
    expect(text).not.toContain("undefined");
    expect(text).not.toContain(", сейчас");
  });

  it("никогда не пишет «через 0 дней»", () => {
    expect(trialNoticeText({ kind: "trial_ending", display_name: null, days_left: 0 }))
      .toContain("через 1 день");
  });

  it("называет цену — человек не должен идти на сайт, чтобы её узнать", () => {
    const ending = trialNoticeText({ kind: "trial_ending", display_name: null, days_left: 2 });
    const ended = trialNoticeText({ kind: "trial_ended", display_name: null, days_left: 0 });
    expect(ending).toMatch(/990\s?₽/);
    expect(ended).toMatch(/990\s?₽/);
  });

  it("берёт цену и лимиты из справочника, а не из текста", () => {
    const facts = { priceRub: 1290, photoLimit: 60, aiLimit: 30, freePhotoLimit: 5, freeAiLimit: 3 };
    const ending = trialNoticeText({ kind: "trial_ending", display_name: null, days_left: 3 }, facts);
    expect(ending).toContain("60 фото и 30 вопросов");
    expect(ending).toContain("останется 5 и 3");
    expect(ending).toMatch(/1\s?290\s?₽/);

    const ended = trialNoticeText({ kind: "trial_ended", display_name: null, days_left: 0 }, facts);
    expect(ended).toContain("5 фото и 3 вопросов");
    expect(ended).toContain("60 фото и 30 вопросов");
    expect(ended).not.toContain("990");
  });

  it("частичный справочник не ломает остальные цифры", () => {
    // Прочиталась только цена — лимиты должны остаться сегодняшними.
    const text = trialNoticeText({ kind: "trial_ending", display_name: null, days_left: 3 }, { priceRub: 1490 });
    expect(text).toContain("40 фото и 20 вопросов");
    expect(text).toContain("останется 10 и 10");
    expect(text).toMatch(/1\s?490\s?₽/);
  });
});
