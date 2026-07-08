"use client";

import { useState, useTransition } from "react";
import { setWeights } from "./actions";

export function WeightControl({
  weights,
}: {
  weights: { judge: number; team: number; audience: number };
}) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [vals, setVals] = useState({
    judge: Math.round(weights.judge * 100),
    team: Math.round(weights.team * 100),
    audience: Math.round(weights.audience * 100),
  });

  const sum = vals.judge + vals.team + vals.audience;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setMsg(null);
    startTransition(async () => {
      const res = await setWeights(fd);
      setMsg(res?.error ?? "저장되었습니다");
    });
  }

  const fields: [keyof typeof vals, string][] = [
    ["judge", "심사위원"],
    ["team", "팀 상호"],
    ["audience", "관객"],
  ];

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-3">
        {fields.map(([k, label]) => (
          <div key={k}>
            <label className="label">{label} (%)</label>
            <input
              name={k}
              type="number"
              min={0}
              max={100}
              value={vals[k]}
              onChange={(e) =>
                setVals((v) => ({ ...v, [k]: Number(e.target.value) }))
              }
              className="input text-right"
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button disabled={pending || sum !== 100} className="btn-primary">
          저장
        </button>
        <span
          className={`text-sm ${sum === 100 ? "text-team" : "text-red-500"}`}
        >
          합계 {sum}%
        </span>
        {msg && <span className="text-sm text-[var(--muted)]">{msg}</span>}
      </div>
    </form>
  );
}
