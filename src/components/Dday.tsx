"use client";

import { useEffect, useState } from "react";

// event_date까지 D-day + 실시간 카운트다운
export function Dday({ eventDate }: { eventDate: string }) {
  const target = new Date(eventDate).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const diff = now === null ? 0 : target - now;
  const past = now !== null && diff <= 0;

  const dday = Math.ceil(diff / 86400000); // 남은 일수(올림)
  const s = Math.max(0, Math.floor(diff / 1000));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  const label = new Date(eventDate).toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-[var(--line)] bg-gradient-to-br from-vote/10 to-transparent p-6">
      <div className="flex items-baseline gap-3">
        <span className="text-5xl font-extrabold tracking-tight text-vote">
          {now === null ? "D-…" : past ? "진행 중" : dday === 0 ? "D-DAY" : `D-${dday}`}
        </span>
        <span className="text-sm text-[var(--muted)]">{label}</span>
      </div>
      {now !== null && !past && (
        <div className="flex gap-2 font-mono text-sm">
          {[
            ["일", days],
            ["시", hours],
            ["분", mins],
            ["초", secs],
          ].map(([unit, v]) => (
            <span
              key={unit as string}
              className="rounded-lg bg-white px-2.5 py-1.5 tabular-nums shadow-sm"
            >
              <b className="text-ink">{pad(v as number)}</b>
              <span className="ml-0.5 text-xs text-[var(--muted)]">
                {unit}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
