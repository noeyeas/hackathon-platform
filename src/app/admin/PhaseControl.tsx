"use client";

import { useState, useTransition } from "react";
import { setPhase } from "./actions";
import { PHASE_LABEL, type EventPhase } from "@/lib/types";

// 현재 진행 단계 고르기. 참가자 화면을 실제로 여닫는 건 OpenControls 쪽
// 스위치이고(0046), 이 값은 홈·헤더에 "지금 어디쯤인지"를 보여주는 용도다.
export function PhaseControl({
  current,
  phases,
}: {
  current: EventPhase;
  phases: EventPhase[];
}) {
  const [phase, setLocal] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function pick(next: EventPhase) {
    const prev = phase;
    setLocal(next);
    setError(null);
    startTransition(async () => {
      const res = await setPhase(next);
      if (res && "error" in res && res.error) {
        setLocal(prev);
        setError(res.error);
      }
    });
  }

  return (
    <div className="card">
      <div className="flex flex-wrap gap-2">
        {phases.map((p) => (
          <button
            key={p}
            disabled={pending || p === phase}
            onClick={() => pick(p)}
            className={p === phase ? "btn-primary" : "btn-ghost"}
            aria-pressed={p === phase}
          >
            {PHASE_LABEL[p]}
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm text-[var(--muted)]">
        투표 진행 · 종료는 <b className="text-ink">심사 · 점수</b> 페이지의 결과
        공개 토글과 같은 값을 씁니다 — 한쪽에서 바꾸면 다른 쪽도 따라 바뀝니다.
      </p>
      {error && <p className="mt-1 text-sm text-alert">{error}</p>}
    </div>
  );
}
