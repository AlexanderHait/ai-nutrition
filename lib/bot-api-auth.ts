import { timingSafeEqual } from "crypto";

function safeEqual(left: string, right: string) {
  if (!left || !right || left.length !== right.length) return false;
  return timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

function requestTokens(request: Request) {
  const authorization = request.headers.get("authorization")?.trim() || "";
  const bearer = authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : "";
  const apiKey = request.headers.get("apikey")?.trim() || "";
  const botSecret = request.headers.get("x-bot-secret")?.trim() || "";
  return [bearer, apiKey, botSecret].filter(Boolean);
}

export function isAuthorizedBotRequest(request: Request) {
  const allowedTokens = [
    process.env.BOT_INGEST_SECRET,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  ]
    .map((value) => value?.trim() || "")
    .filter(Boolean);

  if (!allowedTokens.length) return false;
  return requestTokens(request).some((actual) =>
    allowedTokens.some((expected) => safeEqual(actual, expected)),
  );
}
