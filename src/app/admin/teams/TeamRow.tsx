"use client";

import { useTransition } from "react";
import { deleteTeamAsAdmin } from "./actions";

export function TeamRow({
  id,
  name,
  tagline,
  inviteCode,
  leaderCode,
  memberCount,
  locked,
}: {
  id: string;
  name: string;
  tagline: string | null;
  inviteCode: string;
  leaderCode: string;
  memberCount: number;
  locked: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold">{name}</span>
          <span
            className={`chip ${
              locked ? "border-team text-team" : "border-vote text-vote"
            }`}
          >
            {locked ? "확정됨" : "모집 중"}
          </span>
        </div>
        {tagline && (
          <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
            {tagline}
          </p>
        )}
        <p className="mt-1 text-xs text-[var(--muted)]">
          팀장 코드{" "}
          <span className="select-all font-mono font-semibold text-admin">
            {leaderCode}
          </span>{" "}
          · 팀원 코드{" "}
          <span className="select-all font-mono font-semibold text-ink">
            {inviteCode}
          </span>{" "}
          · {memberCount}/4명
        </p>
      </div>
      <button
        disabled={pending}
        onClick={() => {
          if (
            confirm(
              `'${name}' 팀을 삭제할까요? 소속 팀원·제출물도 함께 삭제됩니다.`
            )
          )
            startTransition(() => void deleteTeamAsAdmin(id));
        }}
        className="shrink-0 text-sm text-[var(--muted)] hover:text-red-500"
      >
        {pending ? "..." : "삭제"}
      </button>
    </div>
  );
}
