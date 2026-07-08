"use client";

import { useState, useTransition } from "react";
import { saveScores } from "./actions";

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
}: {
  projectId: string;
  teamName: string;
  title: string;
  criteria: Criterion[];
  existing: Existing[];
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
    startTransition(async () => {
      const res = await saveScores(projectId, fd);
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
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div>
          <p className="text-xs text-[var(--muted)]">{teamName}</p>
          <p className="font-semibold">{title}</p>
        </div>
        <span className={`chip ${saved ? "border-team text-team" : ""}`}>
          {saved ? "✓ 채점됨" : "미채점"}
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
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <label className="text-sm font-semibold">
                      {c.name}{" "}
                      <span className="text-xs font-bold text-vote">
                        {c.weight}%
                      </span>
                    </label>
                    {c.description && (
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {c.description}
                      </p>
                    )}
                  </div>
                  <div className="flex-none text-right">
                    <input
                      name={`c_${c.id}`}
                      type="number"
                      min={0}
                      max={c.max_score}
                      defaultValue={scoreOf(c.id)}
                      className="input w-20 text-right"
                      required
                    />
                    <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                      / {c.max_score}점
                    </p>
                  </div>
                </div>
              </div>
            ))}
            <textarea
              name="comment"
              rows={2}
              defaultValue={commentOf}
              placeholder="심사 코멘트 (선택)"
              className="input"
            />
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
