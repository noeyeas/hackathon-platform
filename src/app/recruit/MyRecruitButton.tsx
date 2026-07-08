"use client";

import { useState } from "react";
import { RecruitManage } from "./RecruitManage";

type Post = {
  id: string;
  title: string;
  is_open: boolean;
  kind: string;
  positions: string[] | null;
  body: string | null;
  contact: string | null;
};

export function MyRecruitButton({ posts }: { posts: Post[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-ghost whitespace-nowrap"
      >
        내 모집글 ({posts.length})
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">내 모집글</h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-[var(--muted)] hover:bg-gray-100 hover:text-ink"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>

            <RecruitManage posts={posts} />
          </div>
        </div>
      )}
    </>
  );
}
