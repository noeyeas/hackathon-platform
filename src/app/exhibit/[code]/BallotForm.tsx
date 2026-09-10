"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

export type Candidate = {
  id: string;
  title: string;
  team: string;
  description: string;
  thumbnail: string | null;
  track: string;
};

// 전시장에서 주민이 직접 쓰는 화면. 종이 스티커를 붙이던 동작을 그대로 옮긴다 —
// 마음에 든 팀을 최대 N개 고르고 한 번 제출하면 끝.
//
// 되돌릴 수 없는 제출이라 확인 단계를 한 번 둔다. 전시장에서 폰을 든 채
// 잘못 눌러도 되돌릴 방법이 없기 때문이다.
export function BallotForm({
  code,
  maxPicks,
  candidates,
  action,
}: {
  code: string;
  maxPicks: number;
  candidates: Candidate[];
  action: (
    code: string,
    projectIds: string[]
  ) => Promise<{ ok?: boolean; error?: string }>;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const full = picked.length >= maxPicks;

  function toggle(id: string) {
    setError(null);
    setPicked((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length >= maxPicks
          ? prev // 상한을 넘기면 무시 — 먼저 고른 팀을 말없이 빼지 않는다
          : [...prev, id]
    );
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await action(code, picked);
      if (res?.error) {
        setError(res.error);
        setConfirming(false);
        return;
      }
      setDone(true);
    });
  }

  if (done)
    return (
      <div className="card mx-auto max-w-md text-center">
        <p className="text-4xl">🎉</p>
        <h1 className="display mt-3 text-xl">투표해 주셔서 감사합니다!</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          소중한 한 표가 반영되었습니다. 결과는 전시가 끝난 뒤 공개됩니다.
        </p>
        <Link href="/gallery" className="btn-primary mt-5 inline-flex">
          출품작 둘러보기
        </Link>
      </div>
    );

  const pickedNames = candidates
    .filter((c) => picked.includes(c.id))
    .map((c) => c.team || c.title);

  return (
    <div className="mx-auto max-w-2xl pb-28">
      <header className="text-center">
        <p className="eyebrow">Exhibition · 주민투표</p>
        <h1 className="display mt-2 text-2xl">
          마음에 드는 팀을 골라 주세요
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          투표권 한 장에 <b className="text-ink">{maxPicks}표</b>입니다. 서로 다른
          팀에 한 표씩 주실 수 있고, 제출한 뒤에는 바꿀 수 없습니다.
        </p>
      </header>

      <ul className="mt-6 flex flex-col gap-3">
        {candidates.map((c) => {
          const on = picked.includes(c.id);
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => toggle(c.id)}
                aria-pressed={on}
                disabled={!on && full}
                className={`flex w-full items-center gap-4 rounded-lg border p-4 text-left transition ${
                  on
                    ? "border-gold-bright bg-gold-soft"
                    : full
                      ? "border-[var(--line)] opacity-50"
                      : "border-[var(--line)] hover:border-[var(--line-strong)]"
                }`}
              >
                <span className="flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-lg bg-paper">
                  {c.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.thumbnail}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="font-title text-2xl font-bold text-[var(--muted)]">
                      {c.title.slice(0, 1)}
                    </span>
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-[var(--muted)]">
                    {c.team} · {c.track}
                  </span>
                  <span className="mt-0.5 block truncate font-bold">
                    {c.title}
                  </span>
                  {c.description && (
                    <span className="mt-1 line-clamp-2 block text-xs text-[var(--muted)]">
                      {c.description}
                    </span>
                  )}
                </span>

                <span
                  aria-hidden
                  className={`flex h-7 w-7 flex-none items-center justify-center rounded-full border text-sm font-bold ${
                    on
                      ? "border-gold-bright bg-gold-bright text-white"
                      : "border-[var(--line-strong)] text-transparent"
                  }`}
                >
                  ✓
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* 화면 아래 고정 — 목록을 스크롤하는 중에도 몇 표 남았는지 보인다 */}
      <div className="fixed inset-x-0 bottom-0 border-t border-[var(--line)] bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <p className="text-sm text-[var(--muted)]">
            <b className="text-ink tabular-nums">{picked.length}</b> / {maxPicks}팀
            선택
          </p>
          <button
            onClick={() => setConfirming(true)}
            disabled={picked.length === 0 || pending}
            className="btn-primary disabled:opacity-50"
          >
            투표하기
          </button>
        </div>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-sm">
            <h2 className="display text-lg">이대로 투표할까요?</h2>
            <ul className="mt-3 flex flex-col gap-1 text-sm">
              {pickedNames.map((n) => (
                <li key={n} className="font-semibold">
                  · {n}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-[var(--muted)]">
              제출한 뒤에는 바꿀 수 없습니다.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setConfirming(false)}
                disabled={pending}
                className="btn-ghost flex-1"
              >
                다시 고르기
              </button>
              <button
                onClick={submit}
                disabled={pending}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {pending ? "제출 중…" : "투표 제출"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
