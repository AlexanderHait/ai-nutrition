"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronRight,
  Crown,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";

type Notice = {
  id: string;
  tone: "warning" | "info" | "good";
  title: string;
  text: string;
  href: string;
  signature: string;
};

type Achievement = {
  id: string;
  title: string;
  text: string;
};

type Experience = {
  ok: boolean;
  setup_required?: boolean;
  notices?: Notice[];
  achievements?: Achievement[];
  premium_moment?: { title: string; text: string } | null;
};

export default function ClientExperienceCenter({ setupRequired }: { setupRequired: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [data, setData] = useState<Experience | null>(null);
  // Убираем уведомление сразу, не дожидаясь сервера: закрытие должно
  // ощущаться мгновенно, а запись в базу — это уже фон.
  const [dismissed, setDismissed] = useState<string[]>([]);

  function dismiss(notice: Notice) {
    setDismissed((current) => current.includes(notice.id) ? current : [...current, notice.id]);
    fetch("/api/client/experience", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ notice_id: notice.id, signature: notice.signature }),
      cache: "no-store",
    }).catch(() => undefined);
  }

  useEffect(() => {
    if (setupRequired && pathname.startsWith("/client") && pathname !== "/client/setup") {
      router.replace("/client/setup");
      return;
    }
    if (pathname === "/client/setup" || data) return;

    let active = true;
    const timer = window.setTimeout(() => {
      fetch("/api/client/experience", { cache: "no-store" })
        .then((response) => response.ok ? response.json() : null)
        .then((payload) => { if (active && payload?.ok) setData(payload); })
        .catch(() => undefined);
    }, 600);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [data, pathname, router, setupRequired]);

  if (pathname === "/client/setup" || setupRequired || !data) return null;

  const notices = (data.notices || []).filter((notice) => !dismissed.includes(notice.id));
  const achievements = data.achievements || [];
  const count = notices.length;

  return (
    <>
      <style>{`
        /* Кнопка темы висит в правом верхнем углу и раньше налезала на колокольчик.
           Ширина кнопки темы 42px при отступе 16px, поэтому 68px — первое свободное место. */
        .experienceCenter{position:fixed;top:12px;right:68px;z-index:90}
        .experienceCenter>summary{list-style:none;width:42px;height:42px;border:1px solid var(--line);border-radius:13px;background:var(--panel);display:grid;place-items:center;color:var(--gold2);cursor:pointer;box-shadow:var(--shadow);position:relative}
        .experienceCenter>summary::-webkit-details-marker{display:none}
        .experienceCenterBadge{position:absolute;top:-5px;right:-5px;min-width:18px;height:18px;padding:0 5px;border-radius:999px;display:grid;place-items:center;background:var(--gold);color:var(--on-gold);font-size:12.5px;font-weight:900;border:2px solid var(--line)}
        .experiencePanel{position:absolute;top:50px;right:0;width:min(390px,calc(100vw - 24px));max-height:76vh;overflow:auto;padding:16px;border:1px solid var(--line);border-radius:16px;background:var(--panel);box-shadow:var(--shadow)}
        .experiencePanelHead{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px}
        .experiencePanelHead h2{margin:0;font-size:16px}.experiencePanelHead span{display:block;color:var(--muted2);font-size:13px;margin-top:3px}
        .experienceNoticeList{display:grid;gap:7px}
        .experienceNotice{display:grid;grid-template-columns:minmax(0,1fr) 30px;align-items:start;border:1px solid var(--line);border-radius:12px;background:var(--surface-soft)}
        .experienceNoticeMain{display:grid;grid-template-columns:31px minmax(0,1fr) 15px;gap:10px;align-items:start;padding:11px;min-width:0}
        .experienceNotice i{width:31px;height:31px;border-radius:9px;display:grid;place-items:center;background:var(--surface);color:var(--muted)}
        .experienceNotice.warning i{background:var(--accent-soft);color:var(--gold2)}.experienceNotice.good i{background:color-mix(in srgb,var(--green) 16%,var(--surface));color:var(--green)}
        .experienceNotice b{display:block;font-size:13px}.experienceNotice small{display:block;margin-top:3px;color:var(--muted2);font-size:13px;line-height:1.4}
        .experienceNoticeMain>svg{margin-top:7px;color:var(--muted2)}
        .experienceNoticeClose{width:30px;min-height:44px;padding:0;border:0;background:transparent;color:var(--muted2);display:grid;place-items:center;cursor:pointer;border-radius:0 12px 12px 0}
        .experienceNoticeClose:hover{color:var(--text);background:var(--panel2)}
        .experienceNoticeClose:focus-visible{outline:2px solid var(--gold);outline-offset:-2px}
        .experienceSectionTitle{margin:15px 0 8px;color:var(--muted2);font-size:12.5px;text-transform:uppercase;letter-spacing:.11em;font-weight:800}
        .achievementList{display:grid;gap:6px}
        .achievementItem{display:grid;grid-template-columns:29px 1fr;gap:9px;padding:9px 10px;border-radius:11px;background:var(--surface-soft);border:1px solid var(--line)}
        .achievementItem>i{width:29px;height:29px;border-radius:9px;display:grid;place-items:center;color:var(--gold);background:var(--accent-soft)}
        .achievementItem b{display:block;font-size:12.5px}.achievementItem small{display:block;color:var(--muted2);font-size:12.5px;margin-top:2px}
        .premiumMoment{display:grid;grid-template-columns:34px 1fr;gap:10px;margin-top:13px;padding:12px;border-radius:13px;border:1px solid var(--gold2);background:var(--accent-soft)}
        .premiumMoment>i{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;color:var(--gold);background:var(--accent-soft)}
        .premiumMoment b{display:block;font-size:13px}.premiumMoment p{margin:4px 0 9px;color:var(--muted);font-size:13px;line-height:1.4}.premiumMoment a{display:inline-flex;align-items:center;gap:5px;color:var(--gold);font-size:13px;font-weight:800}
        .experienceEmpty{padding:14px;border:1px solid var(--line);border-radius:12px;color:var(--muted2);font-size:12.5px;text-align:center}
        /* На узких экранах кнопка темы стоит на 60px, ширина 40px — значит
           колокольчику нужно уходить дальше, на 108px, иначе они снова слипнутся. */
        @media(max-width:900px){.experienceCenter{top:calc(env(safe-area-inset-top) + 11px);right:108px}.experienceCenter>summary{width:40px;height:40px}.experiencePanel{top:47px;right:-100px;max-height:70vh}}
      `}</style>

      <details className="experienceCenter">
        <summary aria-label="Важные уведомления">
          <Bell size={18} />
          {count > 0 ? <span className="experienceCenterBadge">{count}</span> : null}
        </summary>
        <div className="experiencePanel">
          <div className="experiencePanelHead">
            <div><h2>Важное</h2><span>Только сигналы, которые требуют внимания</span></div>
            {count === 0 ? <CheckCircle2 size={18} color="#77b88d" /> : <Bell size={18} />}
          </div>

          {notices.length ? (
            <div className="experienceNoticeList">
              {notices.map((notice) => (
                <div className={`experienceNotice ${notice.tone}`} key={notice.id}>
                  <Link className="experienceNoticeMain" href={notice.href}>
                    <i>{notice.tone === "warning" ? <AlertTriangle size={15} /> : notice.tone === "good" ? <CheckCircle2 size={15} /> : <Sparkles size={15} />}</i>
                    <span><b>{notice.title}</b><small>{notice.text}</small></span>
                    <ChevronRight size={14} />
                  </Link>
                  <button
                    type="button"
                    className="experienceNoticeClose"
                    aria-label={`Убрать уведомление «${notice.title}»`}
                    title="Убрать"
                    onClick={() => dismiss(notice)}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="experienceEmpty">Сейчас всё спокойно. Новых важных сигналов нет.</div>
          )}

          {achievements.length ? (
            <>
              <div className="experienceSectionTitle">Что уже закрепляется</div>
              <div className="achievementList">
                {achievements.map((achievement) => (
                  <div className="achievementItem" key={achievement.id}>
                    <i><Trophy size={14} /></i>
                    <span><b>{achievement.title}</b><small>{achievement.text}</small></span>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {data.premium_moment ? (
            <div className="premiumMoment">
              <i><Crown size={17} /></i>
              <div>
                <b>{data.premium_moment.title}</b>
                <p>{data.premium_moment.text}</p>
                <Link href="/client/plan">Посмотреть разбор Premium <ChevronRight size={12} /></Link>
              </div>
            </div>
          ) : null}
        </div>
      </details>
    </>
  );
}
