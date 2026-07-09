"use client";

import { useTransition } from "react";
import { deleteTeamAsAdmin } from "./actions";

type Member = { email: string; name: string | null; isLeader: boolean };

export function TeamRow({
  id,
  name,
  tagline,
  leaderCode,
  members,
  locked,
}: {
  id: string;
  name: string;
  tagline: string | null;
  leaderCode: string;
  members: Member[];
  locked: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg bg-gray-50 px-4 py-3">
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
          </span>
        </p>
        {members.length > 0 && (
          <ul className="mt-2 flex flex-col gap-0.5">
            {members.map((m) => (
              <li key={m.email} className="flex items-center gap-1.5 text-xs">
                {m.isLeader && (
                  <span className="chip border-admin text-admin">팀장</span>
                )}
                <span className="select-all font-mono text-ink">
                  {m.email}
                </span>
                {m.name && (
                  <span className="text-[var(--muted)]">({m.name})</span>
                )}
              </li>
            ))}
          </ul>
        )}
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
