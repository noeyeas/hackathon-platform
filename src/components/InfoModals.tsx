"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Dday } from "./Dday";
import { formatDateTime } from "@/lib/format";

type Milestone = { id: string; label: string; target_at: string };
type Notice = {
  id: string;
  title: string;
  body: string | null;
  pinned: boolean;
  created_at: string;
};
type ScheduleItem = {
  id: string;
  time_label: string | null;
  starts_at: string | null;
  title: string;
};

type Which = "dday" | "notice" | "schedule" | null;

export function InfoModals({
  milestones,
  notices,
  schedule,
}: {
  milestones: Milestone[];
  notices: Notice[];
  schedule: ScheduleItem[];
}) {
  const [open, setOpen] = useState<Which>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const buttons: { key: Which; label: string; show: boolean }[] = [
    { key: "dday", label: "⏱️ D-day", show: milestones.length > 0 },
    { key: "notice", label: "📢 공지사항", show: notices.length > 0 },
    { key: "schedule", label: "🗓️ 일정표", show: schedule.length > 0 },
  ];

  const visible = buttons.filter((b) => b.show);
  if (!visible.length) return null;

  const titles: Record<Exclude<Which, null>, string> = {
    dday: "D-day",
    notice: "공지사항",
    schedule: "일정표",
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {visible.map((b) => (
          <button
            key={b.key}
            onClick={() => setOpen(b.key)}
            className="btn-ghost"
          >
            {b.label}
          </button>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          onClick={() => setOpen(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">{titles[open]}</h2>
              <button
                onClick={() => setOpen(null)}
                className="rounded-lg p-1 text-[var(--muted)] hover:bg-gray-100 hover:text-ink"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>

            {open === "dday" && (
              <div className="flex flex-col gap-3">
                {milestones.map((m) => (
                  <Dday key={m.id} label={m.label} targetAt={m.target_at} />
                ))}
              </div>
            )}

            {open === "notice" && (
              <div className="flex flex-col gap-3">
                {notices.map((a) => (
                  <div key={a.id} className="rounded-xl border border-[var(--line)] p-4">
                    <div className="flex items-center gap-2">
                      {a.pinned && (
                        <span className="chip border-vote text-vote">고정</span>
                      )}
                      <h3 className="font-semibold">{a.title}</h3>
                    </div>
                    {a.body && (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--muted)]">
                        {a.body}
                      </p>
                    )}
                    <p className="mt-2 font-mono text-xs text-[var(--muted)]">
                      {new Date(a.created_at).toLocaleDateString("ko-KR", {
                        month: "numeric",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                ))}
                <Link
                  href="/notice"
                  className="text-center text-sm text-[var(--muted)] hover:text-ink"
                >
                  전체 공지 보기 →
                </Link>
              </div>
            )}

            {open === "schedule" && (
              <ol className="flex flex-col">
                {schedule.map((it, i) => (
                  <li
                    key={it.id}
                    className={`flex flex-col gap-0.5 py-3 ${
                      i !== schedule.length - 1
                        ? "border-b border-[var(--line)]"
                        : ""
                    }`}
                  >
                    <span className="font-mono text-xs font-semibold text-vote">
                      {it.starts_at
                        ? formatDateTime(it.starts_at)
                        : (it.time_label ?? "—")}
                    </span>
                    <span className="text-sm">{it.title}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </>
  );
}
