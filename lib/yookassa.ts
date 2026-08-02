type YooAmount = {
  value: string;
  currency: "RUB";
};

export type YooPayment = {
  id: string;
  status: "pending" | "waiting_for_capture" | "succeeded" | "canceled";
  paid?: boolean;
  amount: YooAmount;
  confirmation?: {
    type?: string;
    confirmation_url?: string;
  };
  metadata?: Record<string, string>;
  payment_method?: {
    id?: string;
    saved?: boolean;
    type?: string;
  };
  cancellation_details?: {
    party?: string;
    reason?: string;
  };
  created_at?: string;
  captured_at?: string;
};

export type YooCreatePaymentBody = {
  amount: YooAmount;
  capture: true;
  confirmation: {
    type: "redirect";
    return_url: string;
  };
  description: string;
  metadata: Record<string, string>;
  receipt?: {
    customer: { email: string };
    items: Array<{
      description: string;
      quantity: string;
      amount: YooAmount;
      vat_code: number;
      payment_subject: string;
      payment_mode: string;
    }>;
  };
};

export class YooKassaError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details: unknown) {
    super(message);
    this.name = "YooKassaError";
    this.status = status;
    this.details = details;
  }
}

const REQUEST_TIMEOUT_MS = 10_000;
const RETRY_DELAYS_MS = [250, 750] as const;

export function yooKassaConfigured() {
  return Boolean(
    process.env.YOOKASSA_SHOP_ID?.trim() && process.env.YOOKASSA_SECRET_KEY?.trim(),
  );
}

function credentials() {
  const shopId = process.env.YOOKASSA_SHOP_ID?.trim();
  const secretKey = process.env.YOOKASSA_SECRET_KEY?.trim();
  if (!shopId || !secretKey) {
    throw new Error("YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY are required");
  }
  return { shopId, secretKey };
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

export function isTransientYooKassaError(error: unknown) {
  if (error instanceof YooKassaError) return error.status >= 500 || error.status === 429;
  return isAbortError(error) || error instanceof TypeError;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function yooRequest<T>(
  path: string,
  init: RequestInit = {},
  retryCount = 0,
): Promise<T> {
  const { shopId, secretKey } = credentials();
  let lastError: unknown;

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`https://api.yookassa.ru/v3${path}`, {
        ...init,
        cache: "no-store",
        signal: controller.signal,
        headers: {
          Authorization: `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString("base64")}`,
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(init.headers || {}),
        },
      });

      const text = await response.text();
      let body: unknown = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = text;
      }

      if (!response.ok) {
        throw new YooKassaError(
          `YooKassa request failed (${response.status})`,
          response.status,
          body,
        );
      }

      return body as T;
    } catch (error) {
      lastError = error;
      if (attempt >= retryCount || !isTransientYooKassaError(error)) throw error;
      await sleep(RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)]);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("YooKassa request failed");
}

export async function createYooPayment(body: YooCreatePaymentBody, idempotencyKey: string) {
  return yooRequest<YooPayment>(
    "/payments",
    {
      method: "POST",
      headers: { "Idempotence-Key": idempotencyKey },
      body: JSON.stringify(body),
    },
    2,
  );
}

export async function getYooPayment(paymentId: string) {
  return yooRequest<YooPayment>(`/payments/${encodeURIComponent(paymentId)}`, {}, 1);
}

export function normalizeYooStatus(status: YooPayment["status"] | string) {
  if (status === "succeeded") return "succeeded" as const;
  if (status === "canceled") return "canceled" as const;
  return "pending" as const;
}

export function rublesToYooValue(rubles: number) {
  if (!Number.isInteger(rubles) || rubles <= 0) throw new Error("Invalid RUB amount");
  return rubles.toFixed(2);
}

export function publicSiteUrl(requestUrl: string) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  return new URL(requestUrl).origin;
}
