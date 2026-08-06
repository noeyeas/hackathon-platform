"use client";

import { useState, useTransition } from "react";
import { setVotingOpen, setAudienceVotesBulk } from "./actions";

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
  const [residentOpen, setResidentOpen] = useState(false);

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

      {/* 주민 수기 입력 (토글로 열기/닫기) */}
      <div className="card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-bold">주민 스티커 집계 입력</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              팀별로 센 스티커 수를 입력하세요. 아래 합계를 실제로 나눠준
              스티커 수와 맞춰보면 오타를 잡을 수 있습니다.
            </p>
          </div>
          <button
            onClick={() => setResidentOpen((v) => !v)}
            className="flex-none rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm font-medium text-[var(--muted)] hover:text-ink"
            aria-expanded={residentOpen}
          >
            {residentOpen ? "닫기" : "열기"}
          </button>
        </div>

        {residentOpen &&
          (rows.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--muted)]">
              제출된 팀이 없습니다.
            </p>
          ) : (
            <AudienceTally rows={rows} />
          ))}
      </div>
    </div>
  );
}

// 스티커 집계 입력. 줄마다 저장 버튼을 누르던 방식은 현장에서 한 팀을 빠뜨리기
// 쉬워서, 값을 한곳에 모아 두고 미저장 줄을 표시한 뒤 한 번에 저장한다.
function AudienceTally({ rows }: { rows: Row[] }) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((r) => [r.id, String(r.audience)]))
  );
  // 서버에 실제로 저장된 값 — 미저장 줄을 가려내는 기준
  const [stored, setStored] = useState<Record<string, number>>(() =>
    Object.fromEntries(rows.map((r) => [r.id, r.audience]))
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const num = (v: string | undefined) => Math.max(0, Math.round(Number(v)) || 0);
  const unsaved = rows.filter((r) => num(values[r.id]) !== stored[r.id]);
  const total = rows.reduce((s, r) => s + num(values[r.id]), 0);

  function saveAll() {
    setError(null);
    setDone(null);
    const entries = unsaved.map((r) => ({
      projectId: r.id,
      count: num(values[r.id]),
    }));
    startTransition(async () => {
      const res = await setAudienceVotesBulk(entries);
      if (res?.error) {
        setError(res.error); // 실패를 성공으로 표시하지 않는다
        return;
      }
      setStored((prev) => {
        const next = { ...prev };
        entries.forEach((e) => (next[e.projectId] = e.count));
        return next;
      });
      setDone(`${entries.length}팀 저장했습니다`);
    });
  }

  return (
    <div className="mt-4 flex flex-col gap-2">
      {rows.map((r) => {
        const changed = num(values[r.id]) !== stored[r.id];
        return (
          <div
            key={r.id}
            className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
              changed
                ? "border-navy bg-navy/5"
                : "border-[var(--line)]"
            }`}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{r.team}</p>
              <p className="truncate text-xs text-[var(--muted)]">{r.title}</p>
            </div>
            {changed && (
              <span className="flex-none text-[10px] font-bold text-navy">
                미저장
              </span>
            )}
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={values[r.id] ?? ""}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [r.id]: e.target.value }))
              }
              onFocus={(e) => e.currentTarget.select()}
              aria-label={`${r.team} 스티커 수`}
              className="input h-12 w-24 text-right text-lg font-bold tabular-nums"
            />
          </div>
        );
      })}

      <div className="mt-2 flex items-center justify-between gap-3 border-t border-[var(--line)] pt-3">
        <div>
          <p className="text-sm text-[var(--muted)]">
            합계{" "}
            <b className="text-base text-ink tabular-nums">{total}</b>표
          </p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            {unsaved.length > 0
              ? `${unsaved.length}팀 미저장`
              : "모두 저장됨"}
          </p>
        </div>
        <button
          onClick={saveAll}
          disabled={pending || unsaved.length === 0}
          className="btn-primary flex-none disabled:opacity-50"
        >
          {pending ? "저장 중…" : `${unsaved.length}팀 저장`}
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}
      {done && !error && (
        <p className="text-sm font-medium text-team">{done}</p>
      )}
    </div>
  );
}
