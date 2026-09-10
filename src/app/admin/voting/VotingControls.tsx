"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { setVotingOpen } from "./actions";

export function VotingControls({ votingOpen }: { votingOpen: boolean }) {
  const [open, setOpen] = useState(votingOpen);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !open;
    setOpen(next);
    startTransition(() => void setVotingOpen(next));
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 심사·팀 상호평가 ON/OFF. 전시 주민투표는 별도 스위치다(/admin/audience). */}
      <div className="card flex items-center justify-between">
        <div>
          <h2 className="font-bold">온라인 투표</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            심사위원 채점·팀간 투표를 열고 닫습니다.
          </p>
        </div>
        <button
          onClick={toggle}
          disabled={pending}
          className={`relative h-8 w-14 flex-none rounded-full transition ${
            open ? "bg-team" : "bg-[var(--line-strong)]"
          }`}
          aria-pressed={open}
        >
          <span
            className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${
              open ? "left-7" : "left-1"
            }`}
          />
        </button>
      </div>
      <p className={`text-sm font-semibold ${open ? "text-team" : "text-[var(--muted)]"}`}>
        현재: 투표 {open ? "열림 🟢" : "닫힘 🔴"}
      </p>

      <p className="text-sm text-[var(--muted)]">
        전시 기간 주민투표(QR 투표권 발급·실시간 득표)는{" "}
        <Link href="/admin/audience" className="font-semibold text-navy underline">
          전시 주민투표
        </Link>{" "}
        화면에서 관리합니다.
      </p>
    </div>
  );
}
