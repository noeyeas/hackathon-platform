"use client";

import { useState, useTransition } from "react";

// 점수 입력. 0~max 척도(10 이하)는 큰 탭 버튼으로 제공해 모바일 오조작을 줄인다.
// 폼 제출값은 hidden input(name)에 담기고, 큰 척도는 숫자 입력으로 대체한다.
function ScoreScale({
  name,
  max,
  defaultValue,
}: {
  name: string;
  max: number;
  defaultValue: number | "";
}) {
  const [val, setVal] = useState<number | "">(defaultValue);

  if (max > 10) {
    return (
      <input
        name={name}
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        defaultValue={defaultValue}
        className="input w-24 text-right"
        required
      />
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      <input type="hidden" name={name} value={val} />
      {Array.from({ length: max + 1 }, (_, n) => {
        const selected = val === n;
        return (
          <button
            key={n}
            type="button"
            onClick={() => setVal(n)}
            aria-pressed={selected}
            className={`h-11 min-w-11 rounded-lg border text-base font-semibold tabular-nums transition ${
              selected
                ? "border-vote bg-vote text-white shadow-sm"
                : "border-[var(--line)] bg-white text-ink hover:border-vote/50 active:scale-95"
            }`}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}

type Criterion = {
  id: string;
  name: string;
  max_score: number;
  weight: number;
  description: string | null;
};
type Existing = { criteria_id: string; score: number; comment: string | null };

export function ScoreCard({
  projectId,
  teamName,
  title,
  criteria,
  existing,
  action,
  withComment = true,
}: {
  projectId: string;
  teamName: string;
  title: string;
  criteria: Criterion[];
  existing: Existing[];
  action: (
    projectId: string,
    formData: FormData
  ) => Promise<{ ok?: boolean; error?: string } | void>;
  withComment?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(existing.length > 0);
  const [error, setError] = useState<string | null>(null);

  const scoreOf = (cid: string) =>
    existing.find((e) => e.criteria_id === cid)?.score ?? "";
  const commentOf = existing.find((e) => e.comment)?.comment ?? "";

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    // 모든 기준을 채점했는지 확인 (버튼식 입력은 hidden 이라 브라우저 required 가 안 걸림)
    if (criteria.some((c) => !fd.get(`c_${c.id}`))) {
      setError("모든 항목을 채점해 주세요.");
      return;
    }
    startTransition(async () => {
      const res = await action(projectId, fd);
      if (res?.error) setError(res.error);
      else {
        setSaved(true);
        setOpen(false);
      }
    });
  }

  return (
    <div className="card !p-0">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <div className="min-w-0">
          <p className="text-xs text-[var(--muted)]">{teamName}</p>
          <p className="font-semibold">{title}</p>
        </div>
        <span className="flex flex-none items-center gap-2">
          <span className={`chip ${saved ? "border-team text-team" : ""}`}>
            {saved ? "✓ 채점됨" : "미채점"}
          </span>
          <svg
            viewBox="0 0 24 24"
            className={`h-4 w-4 text-[var(--muted)] transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>

      {open && (
        <form onSubmit={onSubmit} className="border-t border-[var(--line)] p-4">
          <div className="flex flex-col gap-3">
            {criteria.map((c) => (
              <div
                key={c.id}
                className="rounded-lg border border-[var(--line)] p-3"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <label className="text-sm font-semibold">
                    {c.name}{" "}
                    <span className="text-xs font-bold text-vote">
                      {c.weight}%
                    </span>
                  </label>
                  <span className="flex-none text-[10px] text-[var(--muted)]">
                    최대 {c.max_score}점
                  </span>
                </div>
                {c.description && (
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {c.description}
                  </p>
                )}
                <div className="mt-2.5">
                  <ScoreScale
                    name={`c_${c.id}`}
                    max={c.max_score}
                    defaultValue={scoreOf(c.id)}
                  />
                </div>
              </div>
            ))}
            {withComment && (
              <textarea
                name="comment"
                rows={2}
                defaultValue={commentOf}
                placeholder="심사 코멘트 (선택)"
                className="input"
              />
            )}
          </div>
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          <button disabled={pending} className="btn-primary mt-3 w-full">
            {pending ? "저장 중..." : "점수 저장"}
          </button>
        </form>
      )}
    </div>
  );
}
