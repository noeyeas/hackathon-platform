"use client";

import { useState, useTransition } from "react";
import { setResultsPublic } from "../actions";

// 결과(순위·점수) 공개 ON/OFF
export function ResultsToggle({ initialOpen }: { initialOpen: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    const next = !open;
    // 공개는 되돌릴 수 없다 — 한 번 본 순위는 다시 숨길 수 없다. 채점표를
    // 입력하는 같은 화면에 있어 잘못 누르기 쉬우므로 반드시 한 번 더 묻는다.
    if (
      next &&
      !confirm(
        "결과를 공개할까요?\n\n순위와 점수가 참가자·관객 등 모든 사람에게 즉시 공개됩니다. 공개한 뒤에는 이미 본 사람을 되돌릴 수 없습니다."
      )
    )
      return;
    // 낙관적으로 먼저 뒤집고, 서버가 거절하면 되돌린다(OpenControls 와 같은
    // 규칙) — 실패했는데 공개/비공개로 보이면 운영진이 상태를 잘못 안다.
    setOpen(next);
    setError(null);
    startTransition(async () => {
      const res = await setResultsPublic(next);
      if (res && "error" in res && res.error) {
        setOpen(!next);
        setError(res.error);
      }
    });
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
      <p
        className={`mt-3 text-sm font-semibold ${
          open ? "text-team" : "text-[var(--muted)]"
        }`}
      >
        현재: 결과 {open ? "공개됨 🟢" : "비공개 🔒"}
      </p>
      {error && <p className="mt-1 text-sm text-alert">{error}</p>}
    </div>
  );
}
