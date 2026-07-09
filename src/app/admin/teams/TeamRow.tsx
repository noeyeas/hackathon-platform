"use client";

import { useState, useTransition } from "react";
import { deleteTeamAsAdmin, setTeamLeaderEmail } from "./actions";

type Member = { email: string; name: string | null; isLeader: boolean };

export function TeamRow({
  id,
  name,
  tagline,
  leaderEmail,
  members,
  locked,
}: {
  id: string;
  name: string;
  tagline: string | null;
  leaderEmail: string | null;
  members: Member[];
  locked: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState(leaderEmail ?? "");
  const [savePending, startSave] = useTransition();

  const linked = members.some((m) => m.isLeader);

  function saveEmail() {
    startSave(async () => {
      await setTeamLeaderEmail(id, email);
      setEditing(false);
    });
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg bg-gray-50 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold">{name}</span>
          <span
            className={`chip ${
              linked ? "border-team text-team" : "border-vote text-vote"
            }`}
          >
            {linked ? "팀장 연결됨" : "연결 대기"}
          </span>
        </div>
        {tagline && (
          <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
            {tagline}
          </p>
        )}

        {/* 팀장 이메일 (인라인 수정) */}
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[var(--muted)]">팀장 이메일</span>
          {editing ? (
            <>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="leader@example.com"
                className="input !h-7 !w-56 !px-2 !py-1 font-mono text-xs"
                autoFocus
              />
              <button
                onClick={saveEmail}
                disabled={savePending}
                className="font-medium text-vote hover:underline"
              >
                {savePending ? "..." : "저장"}
              </button>
              <button
                onClick={() => {
                  setEmail(leaderEmail ?? "");
                  setEditing(false);
                }}
                className="text-[var(--muted)] hover:text-ink"
              >
                취소
              </button>
            </>
          ) : (
            <>
              <span className="select-all font-mono text-ink">
                {leaderEmail || <span className="text-[var(--muted)]">미설정</span>}
              </span>
              <button
                onClick={() => setEditing(true)}
                className="font-medium text-vote hover:underline"
              >
                {leaderEmail ? "수정" : "설정"}
              </button>
            </>
          )}
        </div>

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
