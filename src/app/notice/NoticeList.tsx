"use client";

import { useState } from "react";

type Announcement = {
  id: string;
  title: string;
  body: string | null;
  pinned: boolean;
  created_at: string;
};

export default function NoticeList({ list }: { list: Announcement[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (!list.length) {
    return (
      <p className="card text-center text-[var(--muted)]">
        아직 공지가 없습니다.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {list.map((a) => {
        const open = openId === a.id;
        return (
          <div key={a.id} className="card p-0 overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenId(open ? null : a.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left"
            >
              {a.pinned ? (
                <span className="chip border-vote text-vote shrink-0">
                  중요 공지
                </span>
              ) : (
                <span className="chip shrink-0">공지</span>
              )}
              <span className="flex-1 truncate font-bold">{a.title}</span>
              <span className="hidden shrink-0 font-mono text-xs text-[var(--muted)] sm:inline">
                {new Date(a.created_at).toLocaleDateString("ko-KR", {
                  timeZone: "Asia/Seoul",
                })}
              </span>
              <span
                className={`shrink-0 text-[var(--muted)] transition-transform ${
                  open ? "rotate-180" : ""
                }`}
                aria-hidden
              >
                ▾
              </span>
            </button>
            {open && (
              <div className="border-t border-[var(--line)] px-4 py-3">
                {a.body ? (
                  <p className="whitespace-pre-wrap text-sm">{a.body}</p>
                ) : (
                  <p className="text-sm text-[var(--muted)]">내용이 없습니다.</p>
                )}
                <p className="mt-3 font-mono text-xs text-[var(--muted)]">
                  {new Date(a.created_at).toLocaleString("ko-KR", {
                    timeZone: "Asia/Seoul",
                  })}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
