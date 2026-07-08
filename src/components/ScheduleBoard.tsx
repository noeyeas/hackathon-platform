"use client";

import { useState } from "react";
import { scheduleWhen } from "@/lib/format";
import { ScheduleCalendar } from "@/components/ScheduleCalendar";

export type SchedItem = {
  id: string;
  time_label: string | null;
  starts_at: string | null;
  ends_at: string | null;
  title: string;
  detail: string | null;
};

// 달력 + 일정표를 묶어 hover 상태를 공유 (달력↔목록 상호 하이라이트)
export function ScheduleBoard({ items }: { items: SchedItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-[20rem_1fr] lg:items-start">
      {/* 왼쪽: 달력 */}
      <ScheduleCalendar
        items={items}
        activeId={activeId}
        onHover={setActiveId}
      />

      {/* 오른쪽: 일정표 */}
      <div className="card !p-0">
        <ol className="flex flex-col">
          {items.map((it, i) => {
            const when = scheduleWhen(it.time_label, it.starts_at);
            const border =
              i !== items.length - 1 ? "border-b border-[var(--line)]" : "";
            const active = activeId === it.id;
            const activeBg = active ? "bg-vote/10" : "";
            const hasDetail = !!it.detail?.trim();

            const hoverProps = {
              onMouseEnter: () => setActiveId(it.id),
              onMouseLeave: () => setActiveId(null),
            };

            if (!hasDetail) {
              return (
                <li
                  key={it.id}
                  {...hoverProps}
                  className={`flex flex-col gap-0.5 px-5 py-4 transition-colors sm:flex-row sm:items-center sm:gap-5 ${activeBg} ${border}`}
                >
                  <span className="font-mono text-sm font-semibold text-vote sm:w-48 sm:flex-none">
                    {when}
                  </span>
                  <span className="text-sm">{it.title}</span>
                </li>
              );
            }

            return (
              <li key={it.id} {...hoverProps} className={border}>
                <details className="group">
                  <summary
                    className={`flex cursor-pointer list-none flex-col gap-0.5 px-5 py-4 transition-colors hover:bg-gray-50 sm:flex-row sm:items-center sm:gap-5 ${activeBg}`}
                  >
                    <span className="font-mono text-sm font-semibold text-vote sm:w-48 sm:flex-none">
                      {when}
                    </span>
                    <span className="flex flex-1 items-center gap-2 text-sm">
                      {it.title}
                      <span className="ml-auto text-[var(--muted)] transition-transform group-open:rotate-180">
                        ⌄
                      </span>
                    </span>
                  </summary>
                  <div className="whitespace-pre-wrap border-t border-dashed border-[var(--line)] bg-gray-50/50 px-5 py-3 text-sm leading-relaxed text-[var(--muted)] sm:pl-[13.25rem]">
                    {it.detail}
                  </div>
                </details>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
