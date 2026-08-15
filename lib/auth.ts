import crypto from "crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getSupabaseServer } from "@/lib/supabase/server";

const COOKIE = "ain_session";

export type Session = {
  role: "admin" | "client";
  accountId?: string;
  chatId?: number;
  authUserId?: string;
  email?: string;
  name?: string;
  exp: number;
};

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET is required");
  return value;
}

export function signSession(data: Omit<Session, "exp">) {
  const payload = Buffer.from(
    JSON.stringify({ ...data, exp: Date.now() + 1000 * 60 * 60 * 24 * 30 }),
  ).toString("base64url");
  const sig = crypto
    .createHmac("sha256", secret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

export function readSession(raw?: string): Session | null {
  try {
    if (!raw) return null;
    const [payload, sig] = raw.split(".");
    const good = crypto
      .createHmac("sha256", secret())
      .update(payload)
      .digest("base64url");
    if (!sig || sig.length !== good.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
    const value = JSON.parse(
      Buffer.from(payload, "base64url").toString(),
    ) as Session;
    return value.exp > Date.now() ? value : null;
  } catch {
    return null;
  }
}

async function accountSessionFromLegacy(raw: Session) {
  const db = getSupabaseAdmin();
  let query = db
    .from("customer_accounts")
    .select("id,auth_user_id,telegram_id,email,display_name,status");
  query = raw.accountId
    ? query.eq("id", raw.accountId)
    : query.eq("telegram_id", raw.chatId!);
  const { data: account } = await query.maybeSingle();
  if (!account || account.status !== "active") return null;

  const chatId = account.telegram_id ? Number(account.telegram_id) : undefined;
  if (chatId && raw.role === "admin") {
    const { data: adminRole } = await db
      .from("admin_users")
      .select("is_active")
      .eq("chat_id", chatId)
      .maybeSingle();
    if (adminRole?.is_active) {
      return {
        ...raw,
        role: "admin" as const,
        accountId: account.id,
        chatId,
        authUserId: account.auth_user_id || undefined,
        email: account.email || undefined,
        name: raw.name || account.display_name || undefined,
      };
    }
  }

  return {
    ...raw,
    role: "client" as const,
    accountId: account.id,
    chatId,
    authUserId: account.auth_user_id || undefined,
    email: account.email || undefined,
    name: raw.name || account.display_name || undefined,
  };
}

/**
 * Unified production session.
 * - Admin password and Telegram admin sessions keep working.
 * - Telegram clients resolve to a canonical customer account.
 * - Email/password clients are validated by Supabase Auth on every request.
 */
async function resolveSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const legacy = readSession(cookieStore.get(COOKIE)?.value);

  if (legacy?.role === "admin" && !legacy.chatId) return legacy;
  if (legacy && (legacy.accountId || legacy.chatId)) {
    try {
      const resolved = await accountSessionFromLegacy(legacy);
      if (resolved) return resolved;
    } catch {
      // Continue with Supabase Auth. Authorization always fails closed.
    }
  }

  try {
    const supabase = await getSupabaseServer();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;

    const db = getSupabaseAdmin();
    const { data: account } = await db
      .from("customer_accounts")
      .select("id,telegram_id,email,display_name,status")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (!account || account.status !== "active") return null;

    return {
      role: "client",
      accountId: account.id,
      chatId: account.telegram_id ? Number(account.telegram_id) : undefined,
      authUserId: user.id,
      email: user.email || account.email || undefined,
      name: account.display_name || undefined,
      exp: user.email_confirmed_at
        ? Date.now() + 1000 * 60 * 60
        : Date.now() + 1000 * 60 * 5,
    };
  } catch {
    return null;
  }
}

export const session = cache(resolveSession);

export async function requireAdmin() {
  const value = await session();
  if (value?.role !== "admin") redirect("/login");
  return value;
}

export async function requireClient() {
  const value = await session();
  // Сессия администратора не должна молча возвращать на форму входа:
  // человек жмёт «Войти», попадает обратно на вход и не понимает, почему.
  if (value?.role === "admin") redirect("/admin");
  if (value?.role !== "client" || !value.accountId) redirect("/login");
  return value;
}

export const sessionCookie = COOKIE;

export function verifyTelegram(data: Record<string, string>) {
  const hash = data.hash;
  if (!hash || !process.env.TELEGRAM_BOT_TOKEN) return false;
  const pairs = Object.entries(data)
    .filter(([key]) => key !== "hash")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const key = crypto
    .createHash("sha256")
    .update(process.env.TELEGRAM_BOT_TOKEN)
    .digest();
  const calc = crypto.createHmac("sha256", key).update(pairs).digest("hex");
  return hash.length === calc.length &&
    crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(calc));
}
