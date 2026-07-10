"use client";

import { useEffect, useState } from "react";
import { ddayCount } from "@/lib/format";

// 특정 마일스톤까지 D-day + 실시간 카운트다운
export function Dday({
  label,
  targetAt,
}: {
  label: string;
  targetAt: string;
}) {
  const target = new Date(targetAt).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const diff = now === null ? 0 : target - now;
  const past = now !== null && diff <= 0;

  const dday = now === null ? 0 : ddayCount(targetAt, now);
  const s = Math.max(0, Math.floor(diff / 1000));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  const dateLabel = new Date(targetAt).toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[var(--line)] bg-gradient-to-br from-vote/10 to-transparent p-5">
      <span className="text-sm font-semibold text-[var(--muted)]">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-extrabold tracking-tight text-vote">
          {now === null ? "D-…" : past ? "종료" : dday === 0 ? "D-DAY" : `D-${dday}`}
        </span>
      </div>
      <span className="text-xs text-[var(--muted)]">{dateLabel}</span>
      {now !== null && !past && (
        <div className="mt-1 flex gap-1.5 text-xs">
          {[
            ["일", days],
            ["시", hours],
            ["분", mins],
            ["초", secs],
          ].map(([unit, v]) => (
            <span
              key={unit as string}
              className="rounded-md bg-white px-2 py-1 tabular-nums shadow-sm"
            >
              <b className="text-ink">{pad(v as number)}</b>
              <span className="ml-0.5 text-[var(--muted)]">{unit}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
