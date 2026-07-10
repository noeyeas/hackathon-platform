"use client";

import { useState, useTransition } from "react";
import { setResultsPublic } from "../actions";

// 결과(순위·점수) 공개 ON/OFF
export function ResultsToggle({ initialOpen }: { initialOpen: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !open;
    setOpen(next);
    startTransition(() => void setResultsPublic(next));
  }

  return (
    <div className="card mt-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-bold">결과 공개</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            켜면 순위·점수가 <b>모든 사람</b>에게 공개됩니다. 꺼두면 운영진만
            미리 볼 수 있어요.
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
      <p
        className={`mt-3 text-sm font-semibold ${
          open ? "text-team" : "text-[var(--muted)]"
        }`}
      >
        현재: 결과 {open ? "공개됨 🟢" : "비공개 🔒"}
      </p>
    </div>
  );
}
