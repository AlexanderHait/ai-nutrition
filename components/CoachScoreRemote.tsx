"use client";

import { useEffect, useState } from "react";
import CoachScoreCard from "@/components/CoachScoreCard";
import type { CoachScore } from "@/lib/coach-score";

export default function CoachScoreRemote({ chatId }: { chatId: number }) {
  const [score, setScore] = useState<CoachScore | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/coach-score?chat_id=${encodeURIComponent(chatId)}`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok || !body?.ok) throw new Error("coach_score_failed");
        if (active) setScore(body.score || null);
      })
      .catch(() => {
        if (active) setScore(null);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [chatId]);

  if (!loaded) return <p className="muted" style={{ marginTop: 18 }}>Считаю Coach Score…</p>;
  return <div style={{ marginTop: 18 }}><CoachScoreCard score={score} compact /></div>;
}
