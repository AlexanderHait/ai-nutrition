import { getSupabaseAdmin } from "@/lib/supabase-admin";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  const { data: account, error: accountError } = await db
    .from("customer_accounts")
    .select("id,telegram_id,email,display_name")
    .eq("status", "active")
    .ilike("login", username)
    .maybeSingle();
  if (accountError) throw accountError;
  if (account) return account;

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("account_id,telegram_id")
    .is("deleted_at", null)
    .ilike("username", username)
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
