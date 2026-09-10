"use client";

import { useState, useTransition } from "react";
import { setTeamEditOpen, setSubmitOpen } from "./actions";

// 팀 정보 수정·프로젝트 제출 스위치. 투표 토글(VotingControls)과 같은 모양으로
// 둔다 — 운영진이 대회 중에 세 개를 번갈아 누르므로 생김새가 같아야 헷갈리지 않는다.
export function OpenControls({
  teamEditOpen,
  submitOpen,
}: {
  teamEditOpen: boolean;
  submitOpen: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Switch
        title="팀 정보 수정"
        desc="팀장이 한 줄 소개·팀원 구성을 고칠 수 있습니다."
        initial={teamEditOpen}
        action={setTeamEditOpen}
      />
      <Switch
        title="프로젝트 제출"
        desc="팀장이 제출물을 올리고 고칠 수 있습니다. 심사 시작 전에 닫으세요."
        initial={submitOpen}
        action={setSubmitOpen}
      />
    </div>
  );
}

function Switch({
  title,
  desc,
  initial,
  action,
}: {
  title: string;
  desc: string;
  initial: boolean;
  action: (open: boolean) => Promise<{ error?: string } | { ok: true }>;
}) {
  const [open, setOpen] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !open;
    // 낙관적으로 먼저 뒤집고, 서버가 거절하면 되돌린다 — 실패한 채로 켜진
    // 것처럼 보이면 운영진이 닫은 줄 알고 넘어간다.
    setOpen(next);
    setError(null);
    startTransition(async () => {
      const res = await action(next);
      if (res && "error" in res && res.error) {
        setOpen(!next);
        setError(res.error);
      }
    });
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-bold">{title}</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">{desc}</p>
        </div>
        <button
          onClick={toggle}
          disabled={pending}
          className={`relative h-8 w-14 flex-none rounded-full transition ${
            open ? "bg-team" : "bg-[var(--line-strong)]"
          }`}
          aria-label={`${title} ${open ? "닫기" : "열기"}`}
          aria-pressed={open}
        >
          <span
            className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${
              open ? "left-7" : "left-1"
            }`}
          />
        </button>
      </div>
      <p
        className={`mt-3 text-sm font-semibold ${
          open ? "text-team" : "text-[var(--muted)]"
        }`}
      >
        현재: {open ? "열림 🟢" : "닫힘 🔴"}
      </p>
      {error && <p className="mt-1 text-sm text-alert">{error}</p>}
    </div>
  );
}
