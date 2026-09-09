"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  setAudienceVotingOpen,
  setVotesPerBallot,
  issueBallots,
  deleteUnusedBallots,
  MAX_ISSUE_AT_ONCE,
} from "./actions";

export type Batch = {
  label: string; // 표시용 ("(라벨 없음)")
  batch: string; // 실제 값 ("" = null)
  total: number;
  used: number;
};

export function AudienceControls({
  votingOpen,
  votesPerBallot,
  batches,
}: {
  votingOpen: boolean;
  votesPerBallot: number;
  batches: Batch[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <OpenToggle open={votingOpen} />
      <PerBallot value={votesPerBallot} locked={votingOpen} />
      <IssueForm />
      <BatchList batches={batches} />
    </div>
  );
}

function OpenToggle({ open: initial }: { open: boolean }) {
  const [open, setOpen] = useState(initial);
  const [pending, startTransition] = useTransition();

  return (
    <div className="card flex items-center justify-between gap-4">
      <div>
        <h2 className="font-bold">전시 주민투표</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          열면 발급된 투표권으로 주민이 바로 투표할 수 있습니다. 팀 상호평가
          스위치와는 별개입니다.
        </p>
        <p
          className={`mt-2 text-sm font-semibold ${
            open ? "text-team" : "text-[var(--muted)]"
          }`}
        >
          현재: 투표 {open ? "열림 🟢" : "닫힘 🔴"}
        </p>
      </div>
      <button
        onClick={() => {
          const next = !open;
          setOpen(next);
          startTransition(() => void setAudienceVotingOpen(next));
        }}
        disabled={pending}
        aria-pressed={open}
        aria-label="전시 주민투표 열기/닫기"
        className={`relative h-8 w-14 flex-none rounded-full transition ${
          open ? "bg-team" : "bg-[var(--line-strong)]"
        }`}
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${
            open ? "left-7" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

function PerBallot({ value, locked }: { value: number; locked: boolean }) {
  const [n, setN] = useState(String(value));
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="card">
      <h2 className="font-bold">투표권 한 장의 표 수</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        종이 스티커 몇 개를 나눠주던 자리입니다. 투표가 열린 뒤에 바꾸면 먼저
        투표한 주민과 표 수가 달라지므로, 닫은 상태에서만 바꿀 수 있습니다.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={10}
          inputMode="numeric"
          value={n}
          disabled={locked}
          onChange={(e) => setN(e.target.value)}
          aria-label="투표권 한 장의 표 수"
          className="input h-11 w-24 text-right text-lg font-bold tabular-nums disabled:opacity-50"
        />
        <button
          onClick={() => {
            setMsg(null);
            startTransition(async () => {
              const res = await setVotesPerBallot(Number(n));
              setMsg(res?.error ?? "저장했습니다");
            });
          }}
          disabled={locked || pending}
          className="btn-ghost disabled:opacity-50"
        >
          저장
        </button>
        {msg && <span className="text-sm text-[var(--muted)]">{msg}</span>}
      </div>
    </div>
  );
}

function IssueForm() {
  const [count, setCount] = useState("100");
  const [batch, setBatch] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);

  return (
    <div className="card">
      <h2 className="font-bold">투표권 발급</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        1회용 QR 을 원하는 매수만큼 만듭니다. 발급 뒤 인쇄해서 전시장에서
        나눠주세요. 한 장은 한 번만 쓸 수 있습니다.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
          매수 (최대 {MAX_ISSUE_AT_ONCE})
          <input
            type="number"
            min={1}
            max={MAX_ISSUE_AT_ONCE}
            inputMode="numeric"
            value={count}
            onChange={(e) => setCount(e.target.value)}
            className="input h-11 w-28 text-right text-lg font-bold tabular-nums"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-xs text-[var(--muted)]">
          묶음 라벨 (예: 10/11 1층)
          <input
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
            placeholder="비워도 됩니다"
            className="input h-11 w-full"
          />
        </label>
        <button
          onClick={() => {
            setError(null);
            setDone(null);
            startTransition(async () => {
              const res = await issueBallots(Number(count), batch);
              if (res?.error) {
                setError(res.error);
                return;
              }
              setDone(res.codes?.length ?? 0);
            });
          }}
          disabled={pending}
          className="btn-primary h-11 disabled:opacity-50"
        >
          {pending ? "발급 중…" : "발급"}
        </button>
      </div>
      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}
      {done !== null && !error && (
        <p className="mt-3 text-sm font-medium text-team">
          {done}장 발급했습니다. 아래 묶음에서 인쇄하세요.
        </p>
      )}
    </div>
  );
}

function BatchList({ batches }: { batches: Batch[] }) {
  return (
    <div className="card">
      <h2 className="font-bold">발급 묶음</h2>
      {batches.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--muted)]">
          아직 발급한 투표권이 없습니다.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col divide-y divide-[var(--line)]">
          {batches.map((b) => (
            <BatchRow key={b.batch} batch={b} />
          ))}
        </ul>
      )}
    </div>
  );
}

function BatchRow({ batch }: { batch: Batch }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const unused = batch.total - batch.used;

  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{batch.label}</p>
        <p className="text-xs text-[var(--muted)] tabular-nums">
          {batch.total}장 발급 · {batch.used}장 사용 · {unused}장 미사용
        </p>
      </div>
      <Link
        href={`/admin/audience/print?batch=${encodeURIComponent(batch.batch)}`}
        className="btn-ghost flex-none"
      >
        인쇄
      </Link>
      <button
        onClick={() => {
          if (
            !confirm(
              `${batch.label} 의 미사용 ${unused}장을 삭제할까요? 이미 사용된 표는 그대로 남습니다.`
            )
          )
            return;
          setError(null);
          startTransition(async () => {
            const res = await deleteUnusedBallots(batch.batch);
            if (res?.error) setError(res.error);
          });
        }}
        disabled={pending || unused === 0}
        className="flex-none text-sm text-[var(--muted)] hover:text-red-600 disabled:opacity-40"
      >
        미사용 삭제
      </button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </li>
  );
}
