"use client";

import { useState, useTransition } from "react";
import { setVotingOpen, setAudienceVotes } from "./actions";

type Row = {
  id: string;
  team: string;
  title: string;
  audience: number;
};

export function VotingControls({
  votingOpen,
  rows,
}: {
  votingOpen: boolean;
  rows: Row[];
}) {
  const [open, setOpen] = useState(votingOpen);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !open;
    setOpen(next);
    startTransition(() => void setVotingOpen(next));
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 투표 ON/OFF */}
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
            open ? "bg-team" : "bg-gray-300"
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

      {/* 주민 수기 입력 */}
      <div className="card">
        <h2 className="font-bold">주민 투표 수기 입력</h2>
        <p className="mb-4 mt-1 text-sm text-[var(--muted)]">
          오프라인에서 집계한 팀별 득표수를 입력하세요. 저장 즉시 집계에 반영됩니다.
        </p>
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">제출된 팀이 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map((r) => (
              <AudienceRow key={r.id} row={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AudienceRow({ row }: { row: Row }) {
  const [value, setValue] = useState(String(row.audience));
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const dirty = value !== String(row.audience);

  function save() {
    startTransition(async () => {
      await setAudienceVotes(row.id, Number(value));
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-[var(--line)] px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{row.team}</p>
        <p className="truncate text-xs text-[var(--muted)]">{row.title}</p>
      </div>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="input w-24 text-right"
      />
      <button
        onClick={save}
        disabled={pending || !dirty}
        className="btn-primary !px-3 !py-2 text-xs"
      >
        {pending ? "..." : saved ? "저장됨" : "저장"}
      </button>
    </div>
  );
}
