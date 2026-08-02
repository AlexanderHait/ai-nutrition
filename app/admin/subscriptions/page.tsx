import TelegramAvatar from "@/components/TelegramAvatar";
import AdminBadge from "@/components/AdminBadge";
import AdminSubscriptionControl from "@/components/AdminSubscriptionControl";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { adminChatIds, adminPremiumData, fmt } from "@/lib/data";
import { BrainCircuit, Crown, CreditCard, Sparkles, Users, Wallet } from "lucide-react";

export const dynamic = "force-dynamic";

type Lifecycle = {
  chat_id: number;
  plan: "basic" | "premium";
  state: "trial" | "active" | "grace" | "cancelled" | "expired";
  trial_ends_at: string | null;
  current_period_end: string | null;
  grace_ends_at: string | null;
  provider: string | null;
};

function premiumActive(row?: Lifecycle | null) {
  if (!row || row.plan !== "premium") return false;
  const now = Date.now();
  if (row.state === "trial") return Boolean(row.trial_ends_at && new Date(row.trial_ends_at).getTime() > now);
  if (row.state === "grace") return Boolean((row.grace_ends_at || row.current_period_end) && new Date(row.grace_ends_at || row.current_period_end!).getTime() > now);
  return row.state === "active" && (!row.current_period_end || new Date(row.current_period_end).getTime() > now);
}

function periodEnd(row?: Lifecycle | null) {
  return row?.state === "trial" ? row.trial_ends_at : row?.state === "grace" ? row.grace_ends_at : row?.current_period_end;
}

export default async function Page() {
  const db = getSupabaseAdmin();
  const [premiumData, adminIds, profilesResult, paymentsResult, lifecycleResult] = await Promise.all([
    adminPremiumData(),
    adminChatIds(),
    db.from("profiles").select("telegram_id,first_name,username,avatar_url,avatar_file_id,avatar_updated_at"),
    db.from("payment_events").select("chat_id,amount_rub,status,created_at").gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()).limit(3000),
    db.from("subscription_lifecycle").select("chat_id,plan,state,trial_ends_at,current_period_end,grace_ends_at,provider"),
  ]);

  const profiles = profilesResult.data || [];
  const payments = paymentsResult.data || [];
  const lifecycle = (lifecycleResult.data || []) as Lifecycle[];
  const profileMap = new Map(profiles.map((profile: any) => [Number(profile.telegram_id), profile]));
  const lifecycleMap = new Map(lifecycle.map((row) => [Number(row.chat_id), row]));
  const premium = lifecycle.filter(premiumActive);
  const basic = profiles.filter((profile: any) => !premiumActive(lifecycleMap.get(Number(profile.telegram_id))));
  const paid = payments.filter((event: any) => ["paid", "success", "succeeded", "completed"].includes(String(event.status || "").toLowerCase()));
  const revenue = paid.reduce((total: number, event: any) => total + Number(event.amount_rub || 0), 0);
  const usage = new Map<string, number>();
  for (const event of premiumData.events) usage.set(event.feature, (usage.get(event.feature) || 0) + 1);

  const managedClients = profiles
    .map((profile: any) => {
      const chatId = Number(profile.telegram_id);
      const life = lifecycleMap.get(chatId) || null;
      return { chatId, profile, life, plan: premiumActive(life) ? "premium" as const : "basic" as const };
    })
    .sort((a, b) => (a.plan === b.plan ? String(a.profile?.first_name || a.chatId).localeCompare(String(b.profile?.first_name || b.chatId), "ru") : a.plan === "premium" ? -1 : 1))
    .slice(0, 100);

  return (
    <>
      <div className="pageHead">
        <div><p>Монетизация</p><h1>Подписки</h1><span>Единое управление Basic / Premium, trial, оплатами и сроками доступа.</span></div>
      </div>

      <div className="adminKpis">
        <K i={<Users />} l="Клиенты" v={fmt(profiles.length)} s={`${basic.length} Basic · ${premium.length} Premium`} />
        <K i={<Crown />} l="Premium" v={fmt(premium.length)} s={`${premium.filter((row) => row.state === "trial").length} trial · ${premiumData.reports.length} отчётов`} />
        <K i={<Wallet />} l="Оплаты · 30 дней" v={`${fmt(revenue)} ₽`} s={`${paid.length} подтверждённых событий`} />
        <K i={<BrainCircuit />} l="Premium actions" v={fmt(premiumData.events.length)} s="за последние 30 дней" />
      </div>

      <div className="adminPremiumGrid top">
        <section className="card">
          <div className="sectionTitleRow"><div><h2>Использование Premium</h2><span className="muted">Какие функции реально создают ценность</span></div><Sparkles /></div>
          <div className="featureUsage">
            {[...usage.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([key, value]) => <div key={key}><span>{key}</span><b>{value}</b></div>)}
            {!usage.size && <p className="muted">События появятся после использования Premium-функций.</p>}
          </div>
        </section>
        <section className="card">
          <h2>Стратегические предложения</h2>
          <div className="miniStats">
            <div className="miniStat"><span>Ожидают решения</span><b>{premiumData.proposals.filter((item: any) => item.status === "pending").length}</b></div>
            <div className="miniStat"><span>Применено</span><b>{premiumData.proposals.filter((item: any) => item.status === "applied").length}</b></div>
            <div className="miniStat"><span>Отклонено</span><b>{premiumData.proposals.filter((item: any) => item.status === "dismissed").length}</b></div>
          </div>
        </section>
      </div>

      <section className="card top">
        <div className="sectionTitleRow"><div><h2>Управление тарифами</h2><span className="muted">Все клиенты, включая Basic без истории оплаты.</span></div><CreditCard /></div>
        <div className="subscriptionManageTable">
          <div className="subscriptionManageHead"><span>Клиент</span><span>Текущий доступ</span><span>Быстрое действие</span><span>Период</span></div>
          {managedClients.map(({ chatId, profile, life, plan }) => {
            const end = periodEnd(life);
            const status = plan === "premium" && life?.state === "trial" ? "PREMIUM TRIAL" : plan.toUpperCase();
            return (
              <div className="subscriptionManageRow" key={chatId}>
                <div className="clientIdentity">
                  <TelegramAvatar profile={profile} size="small" />
                  <span><b>{profile?.first_name || profile?.username || chatId}{adminIds.has(chatId) && <AdminBadge />}</b><small>{profile?.username ? `@${profile.username}` : `ID ${chatId}`}</small></span>
                </div>
                <span className={`planPill ${plan}`}>{status}</span>
                <AdminSubscriptionControl chatId={chatId} currentPlan={plan} compact />
                <span className="subscriptionPeriod">{end ? new Date(end).toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" }) : plan === "basic" ? "базовый доступ" : "без даты окончания"}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card top">
        <div className="sectionTitleRow"><div><h2>Активные Premium-клиенты</h2><span className="muted">Состояние сопровождения</span></div><CreditCard /></div>
        <div className="subscriptionTable">
          {premium.map((row) => {
            const profile: any = profileMap.get(Number(row.chat_id));
            const preference: any = premiumData.preferences.find((item: any) => Number(item.chat_id) === Number(row.chat_id));
            const end = periodEnd(row);
            return (
              <div className="subscriptionRow premiumAdminRow" key={row.chat_id}>
                <div className="clientIdentity"><TelegramAvatar profile={profile} size="small" /><span><b>{profile?.first_name || profile?.username || row.chat_id}{adminIds.has(Number(row.chat_id)) && <AdminBadge />}</b><small>{profile?.username ? `@${profile.username}` : `ID ${row.chat_id}`}</small></span></div>
                <span className="planPill premium">{row.state === "trial" ? "TRIAL" : "PREMIUM"}</span>
                <span>{preference?.notification_level || "normal"}</span>
                <span>{end ? new Date(end).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" }) : "без срока"}</span>
              </div>
            );
          })}
          {!premium.length && <p className="muted">Premium-клиентов пока нет.</p>}
        </div>
      </section>
    </>
  );
}

function K({ i, l, v, s }: { i: React.ReactNode; l: string; v: string; s: string }) {
  return <div className="adminKpi"><i>{i}</i><div><span>{l}</span><b>{v}</b><small>{s}</small></div></div>;
}
