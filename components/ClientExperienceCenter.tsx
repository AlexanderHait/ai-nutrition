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
    if (pathname === "/client/setup") return;

    let active = true;
    fetch("/api/client/experience", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => { if (active && payload?.ok) setData(payload); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [pathname, router, setupRequired]);

  if (pathname === "/client/setup" || setupRequired || !data) return null;

  const notices = data.notices || [];
  const achievements = data.achievements || [];
  const count = notices.length;

  return (
    <>
      <style>{`
        .experienceCenter{position:fixed;top:18px;right:18px;z-index:90}
        .experienceCenter>summary{list-style:none;width:42px;height:42px;border:1px solid #303238;border-radius:12px;background:#111216;display:grid;place-items:center;color:#d8b85f;cursor:pointer;box-shadow:0 12px 38px rgba(0,0,0,.32);position:relative}
        .experienceCenter>summary::-webkit-details-marker{display:none}
        .experienceCenterBadge{position:absolute;top:-5px;right:-5px;min-width:18px;height:18px;padding:0 5px;border-radius:999px;display:grid;place-items:center;background:#d8b85f;color:#111;font-size:9px;font-weight:900;border:2px solid #0a0b0d}
        .experiencePanel{position:absolute;top:50px;right:0;width:min(390px,calc(100vw - 24px));max-height:76vh;overflow:auto;padding:16px;border:1px solid #2c2e33;border-radius:16px;background:#0f1013;box-shadow:0 24px 70px rgba(0,0,0,.58)}
        .experiencePanelHead{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px}
        .experiencePanelHead h2{margin:0;font-size:16px}.experiencePanelHead span{display:block;color:#777b78;font-size:10px;margin-top:3px}
        .experienceNoticeList{display:grid;gap:7px}
        .experienceNotice{display:grid;grid-template-columns:31px minmax(0,1fr) 15px;gap:10px;align-items:start;padding:11px;border:1px solid #24262b;border-radius:12px;background:#121317}
        .experienceNotice>i{width:31px;height:31px;border-radius:9px;display:grid;place-items:center;background:#17181c;color:#9da09c}
        .experienceNotice.warning>i{background:#1c1712;color:#dfad63}.experienceNotice.good>i{background:#111914;color:#77b88d}
        .experienceNotice b{display:block;font-size:12px}.experienceNotice small{display:block;margin-top:3px;color:#888b88;font-size:10px;line-height:1.4}
        .experienceNotice>svg{margin-top:7px;color:#666a67}
        .experienceSectionTitle{margin:15px 0 8px;color:#666a67;font-size:9px;text-transform:uppercase;letter-spacing:.11em;font-weight:800}
        .achievementList{display:grid;gap:6px}
        .achievementItem{display:grid;grid-template-columns:29px 1fr;gap:9px;padding:9px 10px;border-radius:11px;background:#11130f;border:1px solid #25281f}
        .achievementItem>i{width:29px;height:29px;border-radius:9px;display:grid;place-items:center;color:#c7ad60;background:#18180f}
        .achievementItem b{display:block;font-size:11px}.achievementItem small{display:block;color:#7e817b;font-size:9px;margin-top:2px}
        .premiumMoment{display:grid;grid-template-columns:34px 1fr;gap:10px;margin-top:13px;padding:12px;border-radius:13px;border:1px solid #473d24;background:#15130e}
        .premiumMoment>i{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;color:#e0bd64;background:#1d1910}
        .premiumMoment b{display:block;font-size:12px}.premiumMoment p{margin:4px 0 9px;color:#96978f;font-size:10px;line-height:1.4}.premiumMoment a{display:inline-flex;align-items:center;gap:5px;color:#dfbd66;font-size:10px;font-weight:800}
        .experienceEmpty{padding:14px;border:1px solid #25272b;border-radius:12px;color:#838683;font-size:11px;text-align:center}
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
