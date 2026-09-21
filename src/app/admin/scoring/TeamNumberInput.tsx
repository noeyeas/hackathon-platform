"use client";

import { useState, useTransition } from "react";

// 집계표 한 칸에 들어가는 팀별 숫자 입력 — 불참 인원(0052)·발표 점수(0054)가
// 같은 모양을 쓴다. 값을 바꾸면 '저장' 이 나타나고, Enter 로도 저장된다.
export function TeamNumberInput({
  initial,
  max,
  label,
  hint,
  action,
}: {
  initial: number;
  max: number;
  label: string;
  hint: string;
  action: (value: number) => Promise<{ error?: string } | { ok: true }>;
}) {
  const [value, setValue] = useState(String(initial));
  const [saved, setSaved] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty = value !== String(saved);

  function save() {
    const n = Number(value);
    startTransition(async () => {
      const res = await action(n);
      if (res && "error" in res && res.error) {
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
        max={max}
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && dirty) save();
        }}
        aria-label={label}
        title={error ?? hint}
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
