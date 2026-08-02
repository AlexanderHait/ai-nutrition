import TelegramAvatar from "@/components/TelegramAvatar";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Crown,
  LayoutGrid,
  MessageSquare,
  Settings,
  Target,
} from "lucide-react";
import { adminChatIds, adminDashboardData, dayKey, fmt, mealDay, sumMeals } from "@/lib/data";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import AdminBadge from "@/components/AdminBadge";
import SimplifiedSections from "@/components/SimplifiedSections";

export const dynamic = "force-dynamic";

type Attention = {
  id: number;
  profile: any;
  name: string;
  username: string;
  score: number;
  reasons: string[];
};

export default async function Page() {
  const db = getSupabaseAdmin();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [
    { profiles, meals, logs, settings, subscriptions, support },
    adminIds,
    systemResult,
  ] = await Promise.all([
    adminDashboardData(),
    adminChatIds(),
    db.from("system_events")
      .select("id,event_type,severity,workflow,message,created_at")
      .gte("created_at", since24h)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const now = Date.now();
  const today = dayKey();
  const hour = Number(new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    hour: "2-digit",
    hour12: false,
  }).format(new Date()));

  const settingsMap = new Map((settings as any[]).map((item) => [Number(item.chat_id), item]));
  const latestSubscriptions = new Map<number, any>();
  const activity = new Map<number, number>();
  const todayMeals = new Map<number, any[]>();
  const unread = new Map<number, number>();

  for (const subscription of subscriptions as any[]) {
    const id = Number(subscription.chat_id);
    if (id > 0 && !latestSubscriptions.has(id)) latestSubscriptions.set(id, subscription);
  }
  for (const meal of meals as any[]) {
    const id = Number(meal.chat_id);
    if (!(id > 0)) continue;
    const timestamp = new Date(meal.eaten_at).getTime();
    activity.set(id, Math.max(activity.get(id) || 0, timestamp));
    if (mealDay(meal) === today) {
      if (!todayMeals.has(id)) todayMeals.set(id, []);
      todayMeals.get(id)!.push(meal);
    }
  }
  for (const log of logs as any[]) {
    const id = Number(log.chat_id);
    if (!(id > 0)) continue;
    activity.set(id, Math.max(activity.get(id) || 0, new Date(log.created_at).getTime()));
  }
  for (const message of support as any[]) {
    const id = Number(message.chat_id);
    if (id > 0 && message.sender === "client" && !message.read_by_admin_at) {
      unread.set(id, (unread.get(id) || 0) + 1);
    }
  }

  const totalUnread = [...unread.values()].reduce((sum, value) => sum + value, 0);
  const premium = [...latestSubscriptions.values()].filter((item) => item.plan === "premium" && item.status === "active").length;
  const systemIssues = (systemResult.data || [])
    .filter((issue: any) => ["warning", "error", "critical"].includes(String(issue.severity || "").toLowerCase()))
    .slice(0, 10);
  const topSystemIssue = systemIssues[0];

  const attention: Attention[] = profiles.flatMap((profile: any) => {
    const id = Number(profile.telegram_id);
    if (!Number.isFinite(id) || id <= 0) return [];

    const clientSettings: any = settingsMap.get(id);
    const last = activity.get(id) || 0;
    const dayTotal = sumMeals((todayMeals.get(id) || []) as any);
    const target = Number(clientSettings?.kcal_target || 0);
    const reasons: string[] = [];
    const unreadCount = unread.get(id) || 0;

    if (unreadCount) reasons.push(`${unreadCount} непрочит. сообщ.`);
    if (!last && profile.created_at && now - new Date(profile.created_at).getTime() > 3 * 86400000) reasons.push("нет активности");
    if (last && now - last > 3 * 86400000) reasons.push(`${Math.floor((now - last) / 86400000)} дн. без активности`);
    if (hour >= 18 && target > 0 && dayTotal.kcal > 0 && dayTotal.kcal < target * 0.7) reasons.push("сегодня меньше 70% калорий");

    return [{
      id,
      profile,
      name: profile.first_name || profile.username || `Telegram ${id}`,
      username: profile.username ? `@${profile.username}` : "",
      score: unreadCount * 5 + reasons.length,
      reasons,
    }];
  }).filter((item) => item.reasons.length)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  return (
    <>
      <SimplifiedSections />
      <header className="pageHead adminWelcome">
        <div>
          <p>Админка</p>
          <h1>Сегодня</h1>
          <span>{profiles.length} клиентов. Здесь только то, что требует действия.</span>
        </div>
        <Link className="primary compactBtn" href="/admin/dialogs">Диалоги</Link>
      </header>

      <div className="adminKpis adminKpisCompact">
        <K icon={<MessageSquare />} label="Сообщения" value={fmt(totalUnread)} sub={totalUnread ? "нужно ответить" : "новых нет"} />
        <K icon={<AlertTriangle />} label="Клиенты" value={fmt(attention.length)} sub="нужен взгляд" />
        <K icon={systemIssues.length ? <AlertTriangle /> : <CheckCircle2 />} label="Система" value={fmt(systemIssues.length)} sub={systemIssues.length ? "событий за сутки" : "работает штатно"} />
      </div>

      <div className="adminPriorityGrid top">
        <section className="card attentionCenter">
          <div className="sectionTitleRow">
            <div><h2>Кому нужен взгляд</h2><span className="muted">Сообщения, пауза или заметный недобор</span></div>
            <Link className="textLink" href="/admin/activity">Все →</Link>
          </div>
          {attention.length ? (
            <div className="attentionCards">
              {attention.map((item) => (
                <Link href={`/admin/clients/${item.id}`} className="attentionCard" key={item.id}>
                  <TelegramAvatar profile={item.profile} size="small" />
                  <div>
                    <b>{item.name}{adminIds.has(item.id) && <AdminBadge />}</b>
                    <small>{item.username}</small>
                    <p>{item.reasons.join(" · ")}</p>
                  </div>
                  <span>Открыть</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="positiveEmpty"><Target /><b>Сейчас всё спокойно</b><span>Новых сигналов нет.</span></div>
          )}
        </section>

        <aside className="dashboardSide">
          <section className="card">
            <div className="sectionTitleRow"><div><h2>Коротко</h2><span className="muted">Остальное вынесено отдельно</span></div></div>
            <div className="adminActionList">
              <Link className="adminAction" href="/admin/dialogs">
                <i><MessageSquare size={16} /></i>
                <span><b>Ответить клиентам</b><small>{totalUnread ? `${totalUnread} новых сообщений` : "новых сообщений нет"}</small></span>
                <strong>→</strong>
              </Link>
              <Link className="adminAction" href="/admin/system">
                <i>{systemIssues.length ? <AlertTriangle size={16} /> : <Settings size={16} />}</i>
                <span><b>Система</b><small>{topSystemIssue ? topSystemIssue.workflow || topSystemIssue.event_type : "ошибок за сутки нет"}</small></span>
                <strong>{systemIssues.length}</strong>
              </Link>
              <Link className="adminAction" href="/admin/subscriptions">
                <i><Crown size={16} /></i>
                <span><b>Подписки</b><small>{premium} активных Premium</small></span>
                <strong>→</strong>
              </Link>
              <Link className="adminAction" href="/admin/tools">
                <i><LayoutGrid size={16} /></i>
                <span><b>Все разделы</b><small>Аналитика, продукты, n8n и управление</small></span>
                <strong>→</strong>
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}

function K({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return <div className="adminKpi"><i>{icon}</i><div><span>{label}</span><b>{value}</b><small>{sub}</small></div></div>;
}
