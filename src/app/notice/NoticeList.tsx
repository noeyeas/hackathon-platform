"use client";

import { useEffect, useState } from "react";

type Announcement = {
  id: string;
  title: string;
  body: string | null;
  pinned: boolean;
  created_at: string;
};

function relativeTime(iso: string, now: number): string {
  const diff = Math.floor((now - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "방금 전";
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}주 전`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}개월 전`;
  return `${Math.floor(d / 365)}년 전`;
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  });
}

export default function NoticeList({ list }: { list: Announcement[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  // 상대시간은 마운트 후에만 계산해 하이드레이션 불일치 방지
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);

  if (!list.length) {
    return (
      <div className="card flex flex-col items-center gap-2 py-12 text-center">
        <span aria-hidden className="text-3xl">
          📭
        </span>
        <p className="font-medium text-ink">아직 등록된 공지가 없습니다.</p>
        <p className="text-sm text-[var(--muted)]">
          새로운 소식이 올라오면 이곳에 표시됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {list.map((a) => {
        const open = openId === a.id;
        return (
          <div
            key={a.id}
            className={`group overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
              a.pinned
                ? "border-[var(--line)] border-l-4 border-l-vote bg-vote/[0.035]"
                : "border-[var(--line)]"
            }`}
          >
            <button
              type="button"
              onClick={() => setOpenId(open ? null : a.id)}
              aria-expanded={open}
              className="flex w-full items-center gap-3 px-4 py-4 text-left"
            >
              {a.pinned ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-vote px-2.5 py-1 text-xs font-semibold text-white">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3 w-3"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M16 3l5 5-4 1-3 3 1 5-2 2-4-4-5 5-1-1 5-5-4-4 2-2 5 1 3-3 1-4z" />
                  </svg>
                  중요
                </span>
              ) : (
                <span className="chip shrink-0">공지</span>
              )}

              <span className="flex-1 truncate font-bold text-ink">
                {a.title}
              </span>

              <span className="hidden shrink-0 text-xs text-[var(--muted)] sm:inline">
                {now === null ? shortDate(a.created_at) : relativeTime(a.created_at, now)}
              </span>

              <svg
                viewBox="0 0 24 24"
                className={`h-4 w-4 shrink-0 text-[var(--muted)] transition-transform duration-200 ${
                  open ? "rotate-180" : ""
                } group-hover:text-vote`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            <div
              className={`grid transition-all duration-200 ease-out ${
                open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <div className="border-t border-[var(--line)] px-4 py-4">
                  {a.body ? (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
                      {a.body}
                    </p>
                  ) : (
                    <p className="text-sm text-[var(--muted)]">
                      내용이 없습니다.
                    </p>
                  )}
                  <p className="mt-4 text-xs text-[var(--muted)]">
                    {new Date(a.created_at).toLocaleString("ko-KR", {
                      timeZone: "Asia/Seoul",
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
