"use client";

import { useState, useTransition } from "react";
import { setJudgePaperScore } from "../actions";
import { JUDGE_SHEET_MAX } from "@/lib/types";

// 심사위원 종이 채점 평균(0~90) — 운영진이 팀마다 적는다(0057). TeamNumberInput 과
// 모양은 같지만 소수 1자리와 '비움'(null → 웹 채점으로 복귀)을 받아야 해서 따로 둔다.
export function JudgePaperInput({
  teamId,
  round,
  initial,
}: {
  teamId: string;
  round: "final" | "mid";
  initial: number | null;
}) {
  const toStr = (n: number | null) => (n === null ? "" : String(n));
  const [value, setValue] = useState(toStr(initial));
  const [saved, setSaved] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty = value.trim() !== toStr(saved);

  function save() {
    const trimmed = value.trim();
    const n = trimmed === "" ? null : Number(trimmed);
    startTransition(async () => {
      const res = await setJudgePaperScore(teamId, round, n);
      if (res && "error" in res && res.error) {
        setError(res.error);
        return;
      }
      setError(null);
      setSaved(n);
      setValue(toStr(n));
    });
  }

  return (
    <span className="inline-flex items-center gap-1">
      <input
        type="number"
        min={0}
        max={JUDGE_SHEET_MAX}
        step={0.1}
        inputMode="decimal"
        value={value}
        placeholder="—"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && dirty) save();
        }}
        aria-label="심사위원 점수"
        title={error ?? `종이 채점표 평균 (0~${JUDGE_SHEET_MAX}점, 소수 1자리) · 비우면 웹 채점 사용`}
        className={`input !h-7 !w-16 !px-2 !py-1 text-right text-xs tabular-nums ${
          error ? "!border-red-500" : ""
        }`}
      />
      {dirty && (
        <button
          onClick={save}
          disabled={pending}
          className="text-xs font-medium text-navy hover:underline"
        >
          {pending ? "..." : "저장"}
        </button>
      )}
    </span>
  );
}
