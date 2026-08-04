import { afterEach, describe, expect, it } from "vitest";
import { normalizeYooStatus, publicSiteUrl, rublesToYooValue } from "@/lib/yookassa";

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

afterEach(() => {
  if (originalSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
});

describe("rublesToYooValue", () => {
  it("переводит рубли в формат ЮKassa", () => {
    expect(rublesToYooValue(990)).toBe("990.00");
    expect(rublesToYooValue(2990)).toBe("2990.00");
  });

  it("отклоняет суммы, которые нельзя выставить к оплате", () => {
    expect(() => rublesToYooValue(0)).toThrow();
    expect(() => rublesToYooValue(-100)).toThrow();
    expect(() => rublesToYooValue(99.5)).toThrow();
    expect(() => rublesToYooValue(Number.NaN)).toThrow();
  });
});

describe("normalizeYooStatus", () => {
  it("признаёт успешной только succeeded", () => {
    expect(normalizeYooStatus("succeeded")).toBe("succeeded");
    expect(normalizeYooStatus("canceled")).toBe("canceled");
  });

  it("всё незнакомое считает незавершённым, а не оплаченным", () => {
    expect(normalizeYooStatus("pending")).toBe("pending");
    expect(normalizeYooStatus("waiting_for_capture")).toBe("pending");
    expect(normalizeYooStatus("что-угодно")).toBe("pending");
    expect(normalizeYooStatus("")).toBe("pending");
  });
});

describe("publicSiteUrl", () => {
  it("берёт настроенный адрес сайта и убирает хвостовой слэш", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://smartnutrition-ai.ru/";
    expect(publicSiteUrl("https://www.smartnutrition-ai.ru/client/plan")).toBe("https://smartnutrition-ai.ru");
  });

  it("падает обратно на адрес запроса, если переменная не задана", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(publicSiteUrl("https://www.smartnutrition-ai.ru/client/plan")).toBe("https://www.smartnutrition-ai.ru");
  });
});
