"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  deleteTeamAsAdmin,
  relinkTeamLeader,
  setTeamLeaderEmail,
  setTeamNo,
  setTeamWithdrawn,
  unlinkTeamMember,
} from "./actions";

type Member = { email: string; name: string | null; isLeader: boolean };

export function TeamRow({
  id,
  name,
  teamNo,
  tagline,
  leaderEmail,
  members,
  locked,
  withdrawn,
}: {
  id: string;
  name: string;
  teamNo: number | null;
  tagline: string | null;
  leaderEmail: string | null;
  members: Member[];
  locked: boolean;
  withdrawn: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [withdrawPending, startWithdraw] = useTransition();
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState(leaderEmail ?? "");
  const [savePending, startSave] = useTransition();
  // 조 번호 인라인 수정(0058). 번호를 잘못 넣으면(중복 등) 서버 메시지를 보여 준다.
  const [noEditing, setNoEditing] = useState(false);
  const [no, setNo] = useState(teamNo ? String(teamNo) : "");
  const [noError, setNoError] = useState<string | null>(null);
  const [noPending, startNo] = useTransition();
  // 연결 교체·해제(팀장 이메일만 바꿨을 때 구 계정이 남는 문제)
  const [linkPending, startLink] = useTransition();
  const [linkMsg, setLinkMsg] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  const linkedLeader = members.find((m) => m.isLeader) ?? null;
  const linked = linkedLeader !== null;
  // 연결된 팀장 계정이 팀장 이메일과 다르다 — 이메일만 고치면 자동 연결이
  // 이어 주지 않으므로(이미 팀장이 있는 팀은 건너뛴다) 운영진이 눈치채야 한다.
  const mismatch =
    !!leaderEmail && !!linkedLeader && linkedLeader.email !== leaderEmail;

  function runLink(fn: () => Promise<{ ok?: boolean; error?: string; message?: string } | void>) {
    startLink(async () => {
      setLinkMsg(null);
      setLinkError(null);
      const r = await fn();
      if (r?.error) setLinkError(r.error);
      else if (r?.message) setLinkMsg(r.message);
    });
  }

  function saveNo() {
    startNo(async () => {
      const r = await setTeamNo(id, no);
      if (r?.error) {
        setNoError(r.error);
        return;
      }
      setNoError(null);
      setNoEditing(false);
    });
  }

  function saveEmail() {
    startSave(async () => {
      await setTeamLeaderEmail(id, email);
      setEditing(false);
    });
  }

  return (
    <div
      className={`flex items-start justify-between gap-3 rounded-lg bg-paper px-4 py-3 ${
        withdrawn ? "opacity-60" : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {noEditing ? (
            <span className="flex items-center gap-1 text-xs">
              <input
                value={no}
                onChange={(e) => setNo(e.target.value)}
                type="number"
                min={1}
                placeholder="조"
                className="input !h-7 !w-16 !px-2 !py-1 text-xs"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveNo();
                  if (e.key === "Escape") {
                    setNo(teamNo ? String(teamNo) : "");
                    setNoError(null);
                    setNoEditing(false);
                  }
                }}
              />
              <button
                onClick={saveNo}
                disabled={noPending}
                className="font-medium text-navy hover:underline"
              >
                {noPending ? "..." : "저장"}
              </button>
            </span>
          ) : (
            <button
              onClick={() => setNoEditing(true)}
              title="조 번호 수정"
              className={`chip shrink-0 tabular-nums hover:border-navy ${
                teamNo ? "border-navy text-navy" : "border-dashed text-[var(--muted)]"
              }`}
            >
              {teamNo ? `${teamNo}조` : "번호 없음"}
            </button>
          )}
          <span className={`truncate font-semibold ${withdrawn ? "line-through" : ""}`}>
            {name}
          </span>
          {withdrawn && <span className="chip border-alert text-alert">기권</span>}
          <span
            className={`chip ${
              linked ? "border-team text-team" : "border-navy text-navy"
            }`}
          >
            {linked ? "팀장 연결됨" : "연결 대기"}
          </span>
        </div>
        {noError && <p className="mt-0.5 text-xs text-alert">{noError}</p>}
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
                className="font-medium text-navy hover:underline"
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
                className="font-medium text-navy hover:underline"
              >
                {leaderEmail ? "수정" : "설정"}
              </button>
            </>
          )}
        </div>

        {/* 팀장 이메일을 고쳤는데 연결은 구 계정에 남아 있는 상태 */}
        {mismatch && (
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-alert">
            연결된 팀장 계정({linkedLeader.email})이 위 이메일과 다릅니다.
            <button
              disabled={linkPending}
              onClick={() => {
                if (
                  confirm(
                    `'${name}' 팀의 팀장 연결을 ${linkedLeader.email} → ${leaderEmail} 로 옮길까요?`
                  )
                )
                  runLink(() => relinkTeamLeader(id));
              }}
              className="font-medium text-navy hover:underline"
            >
              {linkPending ? "..." : "이메일에 맞게 교체"}
            </button>
          </p>
        )}
        {linkMsg && <p className="mt-1 text-xs text-team">{linkMsg}</p>}
        {linkError && <p className="mt-1 text-xs text-alert">{linkError}</p>}

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
                {/* 계정은 지우지 않고 소속만 끊는다. 팀장 이메일이 그대로면
                    그 사람이 다시 로그인할 때 자동으로 다시 이어진다. */}
                <button
                  disabled={linkPending}
                  onClick={() => {
                    if (
                      confirm(
                        `${m.email} 계정의 '${name}' 팀 연결을 해제할까요? 계정과 제출물은 남습니다.`
                      )
                    )
                      runLink(() => unlinkTeamMember(id, m.email));
                  }}
                  className="text-[var(--muted)] hover:text-alert"
                >
                  연결 해제
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {/* 그 팀의 마이페이지(팀 정보·제출물·반응)를 운영진이 읽기 전용으로 본다 */}
        <Link
          href={`/admin/teams/${id}`}
          className="text-sm font-medium text-navy hover:underline"
        >
          마이페이지 →
        </Link>
        {/* 기권은 삭제와 달리 되돌릴 수 있다 — 심사·평가 대상에서만 뺀다 */}
        <button
          disabled={withdrawPending}
          onClick={() => {
            if (
              withdrawn ||
              confirm(`'${name}' 팀을 기권 처리할까요? 심사·상호평가·순위에서 제외됩니다.`)
            )
              startWithdraw(() => void setTeamWithdrawn(id, !withdrawn));
          }}
          className="text-sm text-[var(--muted)] hover:text-alert"
        >
          {withdrawPending ? "..." : withdrawn ? "기권 취소" : "기권"}
        </button>
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
          className="text-sm text-[var(--muted)] hover:text-red-500"
        >
          {pending ? "..." : "삭제"}
        </button>
      </div>
    </div>
  );
}
