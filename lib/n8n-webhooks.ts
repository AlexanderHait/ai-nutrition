const RAILWAY_BASE = "https://n8n-config-production.up.railway.app";

export const FIRST_CONTACT_WEBHOOK =
  `${RAILWAY_BASE}/webhook/teddy-admin-first-contact-v1`;

export const TIMELINE_WEBHOOK =
  `${RAILWAY_BASE}/webhook/teddy-web-api/timeline-v1`;

export function railwayAuthorization() {
  const configured = process.env.N8N_WEBHOOK_AUTHORIZATION?.trim();
  if (configured) return configured;

  const shared = process.env.BOT_INGEST_SECRET?.trim();
  return shared ? `Bearer ${shared}` : null;
}

export async function postProtectedRailway<T>(url: string, body: unknown): Promise<T> {
  const authorization = railwayAuthorization();
  if (!authorization) throw new Error("N8N webhook authorization is not configured");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload) {
      throw new Error(
        typeof payload?.message === "string"
          ? payload.message
          : `Railway webhook failed with ${response.status}`,
      );
    }
    return payload as T;
  } finally {
    clearTimeout(timeout);
  }
}
