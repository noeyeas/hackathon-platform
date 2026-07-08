"use client";

import { useTransition } from "react";
import { setPhase } from "./actions";
import { PHASE_LABEL, type EventPhase } from "@/lib/types";

export function PhaseControl({
  current,
  phases,
}: {
  current: EventPhase;
  phases: EventPhase[];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      {phases.map((p) => (
        <button
          key={p}
          disabled={pending || p === current}
          onClick={() => startTransition(() => void setPhase(p))}
          className={
            p === current
              ? "btn-primary"
              : "btn-ghost"
          }
        >
          {PHASE_LABEL[p]}
        </button>
      ))}
    </div>
  );
}
