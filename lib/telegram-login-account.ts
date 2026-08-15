import { getSupabaseAdmin } from "@/lib/supabase-admin";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// limit(1) вместо maybeSingle: два аккаунта с похожим логином — это не повод
// отвечать «вход временно недоступен», как было раньше.
const pick = <T,>(rows: T[] | null) => (rows && rows.length ? rows[0] : null);

export type TelegramLoginAccount = {
  id: string;
  telegram_id: string | number | null;
  email: string | null;
  display_name: string | null;
};

export async function resolveTelegramLoginAccount(
  identifier: string,
): Promise<TelegramLoginAccount | null> {
  const db = getSupabaseAdmin();
  const normalized = identifier.trim().toLowerCase();
  const username = normalized.replace(/^@+/, "");

  if (EMAIL_RE.test(normalized)) {
    const { data, error } = await db
      .from("customer_accounts")
      .select("id,telegram_id,email,display_name")
      .eq("status", "active")
      .ilike("email", normalized)
      .limit(1);
    if (error) throw error;
    return withProfileTelegram(db, pick(data));
  }

  const { data: account, error: accountError } = await db
    .from("customer_accounts")
    .select("id,telegram_id,email,display_name")
    .eq("status", "active")
    .ilike("login", username)
    .limit(1);
  if (accountError) throw accountError;
  const loginAccount = pick(account);
  if (loginAccount) return withProfileTelegram(db, loginAccount);

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("account_id,telegram_id")
    .is("deleted_at", null)
    .ilike("username", username)
    .limit(1)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile?.account_id) return null;

  const { data: linkedAccount, error: linkedError } = await db
    .from("customer_accounts")
    .select("id,telegram_id,email,display_name")
    .eq("id", profile.account_id)
    .eq("status", "active")
    .maybeSingle();
  if (linkedError) throw linkedError;
  if (!linkedAccount) return null;

  return {
    ...linkedAccount,
    telegram_id: linkedAccount.telegram_id || profile.telegram_id,
  };
}

// Telegram может быть привязан к аккаунту через профиль бота, а в самой
// customer_accounts остаться пустым. Без этой добивки человек с настоящей
// привязкой получал «Telegram ещё не связан» и упирался в тупик.
async function withProfileTelegram(
  db: ReturnType<typeof getSupabaseAdmin>,
  account: TelegramLoginAccount | null,
): Promise<TelegramLoginAccount | null> {
  if (!account || account.telegram_id) return account;
  const { data: profile } = await db
    .from("profiles")
    .select("telegram_id")
    .eq("account_id", account.id)
    .is("deleted_at", null)
    .not("telegram_id", "is", null)
    .limit(1)
    .maybeSingle();
  return profile?.telegram_id
    ? { ...account, telegram_id: profile.telegram_id }
    : account;
}
