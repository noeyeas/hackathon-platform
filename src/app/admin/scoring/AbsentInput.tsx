"use client";

import { useState, useTransition } from "react";
import { setAbsentCount } from "../actions";

// 참여도 감점 입력 — 팀별 불참 인원(개회식·최종발표 연인원). 저장하면
// rankings 뷰가 심사 점수에서 인당 1점(최대 5점)을 뺀다(0052).
export function AbsentInput({
  teamId,
  initial,
}: {
  teamId: string;
  initial: number;
}) {
  const [value, setValue] = useState(String(initial));
  const [saved, setSaved] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty = value !== String(saved);

  function save() {
    const n = Number(value);
    startTransition(async () => {
      const res = await setAbsentCount(teamId, n);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setError(null);
      setSaved(n);
    });
  }

  return (
    <span className="inline-flex items-center gap-1">
      <input
        type="number"
        min={0}
        max={99}
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && dirty) save();
        }}
        aria-label="불참 인원"
        title={error ?? "불참 인원 (인당 1점 감점, 최대 5점)"}
        className={`input !h-7 !w-14 !px-2 !py-1 text-right text-xs tabular-nums ${
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
