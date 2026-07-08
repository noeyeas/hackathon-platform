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

const DISMISS_KEY = "hackathon_info_dismissed";

export function InfoModals({
  milestones,
  notices,
  schedule,
}: {
  milestones: Milestone[];
  notices: Notice[];
  schedule: ScheduleItem[];
}) {
  const [open, setOpen] = useState(false);

  const hasContent =
    milestones.length > 0 || notices.length > 0 || schedule.length > 0;

  // 접속 시 자동으로 팝업 표시 (오늘 하루 보지 않기 처리)
  useEffect(() => {
    if (!hasContent) return;
    const today = new Date().toDateString();
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed !== today) setOpen(true);
  }, [hasContent]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function dismissToday() {
    localStorage.setItem(DISMISS_KEY, new Date().toDateString());
    setOpen(false);
  }

  if (!open || !hasContent) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--line)] px-6 py-4">
          <h2 className="text-lg font-bold">📣 대회 안내</h2>
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg p-1 text-[var(--muted)] hover:bg-gray-100 hover:text-ink"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-6 overflow-y-auto px-6 py-5">
          {/* D-day */}
          {milestones.length > 0 && (
            <div className="flex flex-col gap-3">
              {milestones.map((m) => (
                <Dday key={m.id} label={m.label} targetAt={m.target_at} />
              ))}
            </div>
          )}

          {/* 공지사항 */}
          {notices.length > 0 && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">📢 공지사항</h3>
                <Link
                  href="/notice"
                  className="text-sm text-[var(--muted)] hover:text-ink"
                >
                  전체 →
                </Link>
              </div>
              {notices.map((a) => (
                <div
                  key={a.id}
                  className="rounded-xl border border-[var(--line)] p-4"
                >
                  <div className="flex items-center gap-2">
                    {a.pinned && (
                      <span className="chip border-vote text-vote">고정</span>
                    )}
                    <h4 className="font-semibold">{a.title}</h4>
                  </div>
                  {a.body && (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--muted)]">
                      {a.body}
                    </p>
                  )}
                </div>
              ))}
            </section>
          )}

          {/* 일정표 */}
          {schedule.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="font-bold">🗓️ 일정표</h3>
              <ol className="flex flex-col rounded-xl border border-[var(--line)]">
                {schedule.map((it, i) => (
                  <li
                    key={it.id}
                    className={`flex flex-col gap-0.5 px-4 py-3 ${
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
            </section>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--line)] px-6 py-3">
          <button
            onClick={dismissToday}
            className="text-sm text-[var(--muted)] hover:text-ink"
          >
            오늘 하루 보지 않기
          </button>
          <button onClick={() => setOpen(false)} className="btn-primary">
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
