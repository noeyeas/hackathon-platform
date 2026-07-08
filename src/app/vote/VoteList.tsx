"use client";

import { useState, useTransition } from "react";
import { castTeamVote, castAudienceVote } from "./actions";

type P = { id: string; title: string; team: string };

export function VoteList({
  projects,
  mode,
  token,
  votedIds,
  disabled,
}: {
  projects: P[];
  mode: "team" | "audience";
  token?: string;
  votedIds: string[];
  disabled: boolean;
}) {
  const [voted, setVoted] = useState<string[]>(votedIds);
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 팀 투표는 1표만 — 이미 투표했으면 전체 잠금
  const teamLocked = mode === "team" && voted.length > 0;

  function vote(projectId: string) {
    setError(null);
    setBusyId(projectId);
    startTransition(async () => {
      const res =
        mode === "team"
          ? await castTeamVote(projectId)
          : await castAudienceVote(token!, projectId);
      setBusyId(null);
      if (res?.error) setError(res.error);
      else setVoted((v) => [...v, projectId]);
    });
  }

  if (!projects.length) {
    return (
      <p className="card text-center text-[var(--muted)]">
        투표할 작품이 없습니다.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">
          {error}
        </p>
      )}
      {projects.map((p) => {
        const hasVoted = voted.includes(p.id);
        const lock = disabled || teamLocked || hasVoted || pending;
        return (
          <div
            key={p.id}
            className="card flex items-center justify-between !p-4"
          >
            <div>
              <p className="text-xs text-[var(--muted)]">{p.team}</p>
              <p className="font-semibold">{p.title}</p>
            </div>
            <button
              onClick={() => vote(p.id)}
              disabled={lock}
              className={hasVoted ? "btn-ghost !text-team" : "btn-primary"}
            >
              {hasVoted
                ? "✓ 투표함"
                : busyId === p.id
                  ? "..."
                  : "투표"}
            </button>
          </div>
        );
      })}
      {teamLocked && (
        <p className="text-center text-sm text-[var(--muted)]">
          팀 투표를 완료했습니다. (팀당 1표)
        </p>
      )}
    </div>
  );
}
