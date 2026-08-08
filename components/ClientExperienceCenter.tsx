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
} from "lucide-react";

type Notice = {
  id: string;
  tone: "warning" | "info" | "good";
  title: string;
  text: string;
  href: string;
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

  const notices = data.notices || [];
  const achievements = data.achievements || [];
  const count = notices.length;

  return (
    <>
      <style>{`
        .experienceCenter{position:fixed;top:18px;right:18px;z-index:90}
        .experienceCenter>summary{list-style:none;width:42px;height:42px;border:1px solid var(--line);border-radius:12px;background:var(--bg);display:grid;place-items:center;color:var(--gold);cursor:pointer;box-shadow:0 12px 38px rgba(0,0,0,.32);position:relative}
        .experienceCenter>summary::-webkit-details-marker{display:none}
        .experienceCenterBadge{position:absolute;top:-5px;right:-5px;min-width:18px;height:18px;padding:0 5px;border-radius:999px;display:grid;place-items:center;background:var(--gold);color:var(--on-gold);font-size:12.5px;font-weight:900;border:2px solid var(--line)}
        .experiencePanel{position:absolute;top:50px;right:0;width:min(390px,calc(100vw - 24px));max-height:76vh;overflow:auto;padding:16px;border:1px solid var(--line);border-radius:16px;background:var(--bg);box-shadow:0 24px 70px rgba(0,0,0,.58)}
        .experiencePanelHead{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px}
        .experiencePanelHead h2{margin:0;font-size:16px}.experiencePanelHead span{display:block;color:var(--muted2);font-size:13px;margin-top:3px}
        .experienceNoticeList{display:grid;gap:7px}
        .experienceNotice{display:grid;grid-template-columns:31px minmax(0,1fr) 15px;gap:10px;align-items:start;padding:11px;border:1px solid var(--line);border-radius:12px;background:var(--bg)}
        .experienceNotice>i{width:31px;height:31px;border-radius:9px;display:grid;place-items:center;background:var(--surface-soft);color:var(--muted)}
        .experienceNotice.warning>i{background:#1c1712;color:var(--gold)}.experienceNotice.good>i{background:color-mix(in srgb,var(--green) 16%,var(--surface));color:var(--green)}
        .experienceNotice b{display:block;font-size:13px}.experienceNotice small{display:block;margin-top:3px;color:var(--muted2);font-size:13px;line-height:1.4}
        .experienceNotice>svg{margin-top:7px;color:var(--muted2)}
        .experienceSectionTitle{margin:15px 0 8px;color:var(--muted2);font-size:12.5px;text-transform:uppercase;letter-spacing:.11em;font-weight:800}
        .achievementList{display:grid;gap:6px}
        .achievementItem{display:grid;grid-template-columns:29px 1fr;gap:9px;padding:9px 10px;border-radius:11px;background:var(--bg);border:1px solid var(--line)}
        .achievementItem>i{width:29px;height:29px;border-radius:9px;display:grid;place-items:center;color:var(--gold);background:var(--accent-soft)}
        .achievementItem b{display:block;font-size:12.5px}.achievementItem small{display:block;color:var(--muted2);font-size:12.5px;margin-top:2px}
        .premiumMoment{display:grid;grid-template-columns:34px 1fr;gap:10px;margin-top:13px;padding:12px;border-radius:13px;border:1px solid var(--gold2);background:var(--accent-soft)}
        .premiumMoment>i{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;color:var(--gold);background:var(--accent-soft)}
        .premiumMoment b{display:block;font-size:13px}.premiumMoment p{margin:4px 0 9px;color:var(--muted);font-size:13px;line-height:1.4}.premiumMoment a{display:inline-flex;align-items:center;gap:5px;color:var(--gold);font-size:13px;font-weight:800}
        .experienceEmpty{padding:14px;border:1px solid var(--line);border-radius:12px;color:var(--muted2);font-size:12.5px;text-align:center}
        @media(max-width:900px){.experienceCenter{top:10px;right:68px}.experienceCenter>summary{width:40px;height:40px}.experiencePanel{top:47px;right:-55px;max-height:70vh}}
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
                <Link className={`experienceNotice ${notice.tone}`} href={notice.href} key={notice.id}>
                  <i>{notice.tone === "warning" ? <AlertTriangle size={15} /> : notice.tone === "good" ? <CheckCircle2 size={15} /> : <Sparkles size={15} />}</i>
                  <span><b>{notice.title}</b><small>{notice.text}</small></span>
                  <ChevronRight size={14} />
                </Link>
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
