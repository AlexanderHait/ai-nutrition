import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Bot,
  Camera,
  Database,
  Gauge,
  LayoutGrid,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { systemHealth } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await systemHealth();

  return (
    <>
      <div className="pageHead">
        <div>
          <p>Система</p>
          <h1>Технический контроль</h1>
          <span>Все технические показатели и редкие инструменты находятся здесь, а не на главной админки.</span>
        </div>
        <Link className="secondaryBtn" href="/admin/tools"><LayoutGrid size={16} />Все инструменты</Link>
      </div>

      <div className="metricGrid">
        <M icon={<ShieldCheck />} label="Ошибки · 24 ч" value={data.errors24} note={data.errors24 ? "требуют проверки" : "критичных событий нет"} />
        <M icon={<MessageSquare />} label="Telegram · 24 ч" value={data.updates24} note={`${data.duplicates24} дублей заблокировано`} />
        <M icon={<Camera />} label="Распознавание · 7 д" value={`${data.recognitionAvg}%`} note={`${data.recognitionReview}/${data.recognition7} требуют проверки`} />
        <M icon={<Bot />} label="AI · 7 дней" value={data.ai7} note={`${data.aiSuccess}% успешно`} />
        <M icon={<Gauge />} label="AI latency" value={data.aiAvgMs ? `${data.aiAvgMs} ms` : "—"} note={data.aiP95Ms ? `p95 ${data.aiP95Ms} ms` : "данных пока нет"} />
        <M icon={<Database />} label="Приёмы · 24 ч" value={data.meals24} note="сохранено" />
        <M icon={<Activity />} label="Очередь" value={data.jobsQueued} note={`${data.jobsDead} dead jobs`} />
        <M icon={<AlertTriangle />} label="Circuit breakers" value={data.circuits.filter((item: any) => item.state !== "closed").length} note={`${data.circuits.length} сервисов отслеживается`} />
      </div>

      <div className="adminPremiumGrid top">
        <section className="card">
          <div className="sectionTitleRow"><div><h2>Сервисы</h2><span className="muted">Защита от каскадных ошибок</span></div><ShieldCheck /></div>
          <div className="featureUsage">
            {data.circuits.map((item: any) => <div key={item.service}><span>{item.service}</span><b className={`circuit ${item.state}`}>{item.state}</b></div>)}
            {!data.circuits.length ? <p className="muted">Сбоев внешних сервисов не зарегистрировано.</p> : null}
          </div>
        </section>

        <section className="card">
          <h2>Качество распознавания</h2>
          <div className="miniStats">
            <div className="miniStat"><span>Средняя уверенность</span><b>{data.recognitionAvg}%</b></div>
            <div className="miniStat"><span>Нужна проверка</span><b>{data.recognitionReview}</b></div>
            <div className="miniStat"><span>Всего · 7 д</span><b>{data.recognition7}</b></div>
          </div>
        </section>
      </div>

      <section className="card top">
        <div className="sectionTitleRow"><div><h2>Последние системные события</h2><span className="muted">Ошибки и предупреждения хранятся 45 дней</span></div><Activity /></div>
        <div className="healthTable">
          {data.events.slice(0, 50).map((item: any) => (
            <div className="systemEvent" key={item.id}>
              <span className={`sev ${item.severity}`}>{item.severity}</span>
              <span><b>{item.event_type}</b><small>{item.workflow || "system"} · {new Date(item.created_at).toLocaleString("ru-RU")}</small></span>
              <p>{item.message || "—"}</p>
            </div>
          ))}
          {!data.events.length ? <p className="muted">Системных событий пока нет.</p> : null}
        </div>
      </section>
    </>
  );
}

function M({
  icon,
  label,
  value,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  note: string;
}) {
  return <div className="metricCard"><i>{icon}</i><span>{label}</span><b>{value}</b><small>{note}</small></div>;
}
