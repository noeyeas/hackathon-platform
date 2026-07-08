"use client";

import { useState, useTransition } from "react";
import {
  toggleRecruitPost,
  deleteRecruitPost,
  editRecruitPost,
} from "./actions";

type Post = {
  id: string;
  title: string;
  is_open: boolean;
  kind: string;
  positions: string[] | null;
  body: string | null;
  contact: string | null;
};

export function RecruitManage({ posts }: { posts: Post[] }) {
  return (
    <div className="mt-4 flex flex-col gap-2">
      {posts.map((p) => (
        <Row key={p.id} p={p} />
      ))}
    </div>
  );
}

function Row({ p }: { p: Post }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isTeam = p.kind !== "individual";
  const run = (fn: () => Promise<unknown>) =>
    startTransition(() => void fn());

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const res = await editRecruitPost(p.id, fd);
      if (res?.error) setError(res.error);
      else setEditing(false);
    });
  }

  return (
    <div className="rounded-lg border border-[var(--line)] bg-white">
      <div className="flex items-center justify-between px-3 py-2 text-sm">
        <span className="flex min-w-0 items-center gap-2">
          <span
            className={`h-2 w-2 flex-none rounded-full ${
              p.is_open ? "bg-team" : "bg-gray-300"
            }`}
          />
          <span className="truncate">{p.title}</span>
        </span>
        <span className="flex flex-none gap-3 text-xs">
          <button
            disabled={pending}
            onClick={() => setEditing((v) => !v)}
            className="text-[var(--muted)] hover:text-ink"
          >
            {editing ? "닫기" : "수정"}
          </button>
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

      {editing && (
        <form onSubmit={onSave} className="border-t border-[var(--line)] p-3">
          <label className="label">제목</label>
          <input name="title" required defaultValue={p.title} className="input" />

          <label className="label mt-2">
            {isTeam ? "필요한 역할" : "가능한 역할 / 기술"} (쉼표로 구분)
          </label>
          <input
            name="positions"
            defaultValue={(p.positions ?? []).join(", ")}
            className="input"
          />

          <label className="label mt-2">소개</label>
          <textarea
            name="body"
            rows={2}
            defaultValue={p.body ?? ""}
            className="input"
          />

          <label className="label mt-2">연락 방법</label>
          <input
            name="contact"
            defaultValue={p.contact ?? ""}
            className="input"
          />

          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

          <div className="mt-3 flex gap-2">
            <button disabled={pending} className="btn-primary flex-1">
              {pending ? "저장 중..." : "저장"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="btn-ghost"
            >
              취소
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
