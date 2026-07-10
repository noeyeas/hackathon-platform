"use client";

import { useEffect, useState } from "react";
import { ddayCount } from "@/lib/format";

export type TimelineNode = {
  date: string; // 표시용 (예: "9.18")
  label: string;
  at: string; // ISO — 진행도·D-day 계산용
  place?: string | null;
};

// 히어로 하단에 풀폭으로 고정되는 진행형 타임라인 (운영진이 마일스톤으로 관리).
// 지난 단계는 채우고(흰색), 다가올 단계는 비운다.
export function HeroTimeline({ nodes }: { nodes: TimelineNode[] }) {
  // SSR 시 0 → 마운트 후 실제 진행도 반영 (하이드레이션 불일치 방지)
  const [done, setDone] = useState(0);
  const [dday, setDday] = useState<number | null>(null);
  useEffect(() => {
    const now = Date.now();
    const past = nodes.filter((n) => now >= new Date(n.at).getTime()).length;
    setDone(past);
    const next = nodes[past];
    setDday(next ? ddayCount(next.at, now) : null);
  }, [nodes]);

  if (nodes.length === 0) return null;

  const last = nodes.length - 1;
  // 노드 중심 사이 구간(첫 노드~끝 노드)을 기준으로 채워진 비율
  const frac = done <= 0 ? 0 : Math.min(done - 1, last) / Math.max(last, 1);

  return (
    <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/70 via-black/40 to-transparent px-5 pb-6 pt-12 text-white">
      <div className="relative mx-auto w-full max-w-3xl">
        {/* 배경선 (첫 노드 중심 ~ 끝 노드 중심) */}
        <div className="absolute left-[12.5%] right-[12.5%] top-[7px] h-px bg-white/25" />
        {/* 진행선 */}
        <div
          className="absolute left-[12.5%] top-[7px] h-px bg-white transition-[width] duration-700 ease-out"
          style={{ width: `calc(75% * ${frac})` }}
        />

        <div className="relative flex justify-between">
          {nodes.map((n, i) => {
            const filled = i < done;
            const active = i === done; // 현재 진행 중(다음) 단계
            return (
              <div
                key={`${n.label}-${i}`}
                className="relative flex flex-1 flex-col items-center gap-2 text-center"
              >
                {active && dday !== null && (
                  <span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/30 bg-white/15 px-2 py-0.5 text-[11px] font-medium tabular-nums text-white shadow-lg backdrop-blur-sm">
                    {dday <= 0 ? "D-DAY" : `D-${dday}`}
                  </span>
                )}
                <span
                  className={`h-3.5 w-3.5 rounded-full border-2 border-white ${
                    filled
                      ? "bg-white timeline-dot-done"
                      : active
                        ? "bg-white/40 timeline-dot-active"
                        : "bg-transparent shadow-[0_0_0_4px_rgba(0,0,0,0.3)]"
                  }`}
                />
                <span className="text-xs font-bold tracking-tight sm:text-sm">
                  {n.date}
                </span>
                <span
                  className={`text-[10px] leading-tight sm:text-xs ${
                    filled || active ? "text-white" : "text-white/70"
                  }`}
                >
                  {n.label}
                </span>
                {n.place && (
                  <span className="text-[10px] leading-tight text-white/80">
                    📍 {n.place}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
