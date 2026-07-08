"use client";

import { useTransition } from "react";
import { toggleRecruitPost, deleteRecruitPost } from "./actions";

type Post = { id: string; title: string; is_open: boolean };

export function RecruitManage({ posts }: { posts: Post[] }) {
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<unknown>) => startTransition(() => void fn());

  return (
    <div className="mt-4 border-t border-[var(--line)] pt-4">
      <p className="mb-2 text-sm font-medium">우리 팀 모집글</p>
      <div className="flex flex-col gap-2">
        {posts.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm"
          >
            <span className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  p.is_open ? "bg-team" : "bg-gray-300"
                }`}
              />
              {p.title}
            </span>
            <span className="flex gap-3 text-xs">
              <button
                disabled={pending}
                onClick={() => run(() => toggleRecruitPost(p.id, !p.is_open))}
                className="text-[var(--muted)] hover:text-ink"
              >
                {p.is_open ? "마감" : "다시 열기"}
              </button>
              <button
                disabled={pending}
                onClick={() => {
                  if (confirm("삭제할까요?")) run(() => deleteRecruitPost(p.id));
                }}
                className="text-[var(--muted)] hover:text-red-500"
              >
                삭제
              </button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
