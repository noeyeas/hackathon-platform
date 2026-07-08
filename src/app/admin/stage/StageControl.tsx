"use client";

import { useTransition } from "react";
import { setPresenting, movePresenting } from "./actions";

type P = { id: string; title: string; team: string };

export function StageControl({
  projects,
  currentId,
}: {
  projects: P[];
  currentId: string | null;
}) {
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<unknown>) => startTransition(() => void fn());

  return (
    <div className="mt-6 flex flex-col gap-5">
      <div className="flex gap-2">
        <button
          disabled={pending}
          onClick={() => run(() => movePresenting("prev"))}
          className="btn-ghost flex-1"
        >
          ← 이전 팀
        </button>
        <button
          disabled={pending}
          onClick={() => run(() => movePresenting("next"))}
          className="btn-primary flex-1"
        >
          다음 팀 →
        </button>
        <button
          disabled={pending || !currentId}
          onClick={() => run(() => setPresenting(null))}
          className="btn-ghost"
        >
          발표 종료
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {projects.map((p, i) => {
          const active = p.id === currentId;
          return (
            <button
              key={p.id}
              disabled={pending}
              onClick={() => run(() => setPresenting(p.id))}
              className={`flex items-center justify-between rounded-xl border p-3 text-left transition ${
                active
                  ? "border-vote bg-vote/10"
                  : "border-[var(--line)] bg-white hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-[var(--muted)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="text-xs text-[var(--muted)]">{p.team}</p>
                  <p className="font-semibold">{p.title}</p>
                </div>
              </div>
              {active && (
                <span className="chip border-vote text-vote">발표 중</span>
              )}
            </button>
          );
        })}
        {!projects.length && (
          <p className="card text-center text-[var(--muted)]">
            제출작이 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}
