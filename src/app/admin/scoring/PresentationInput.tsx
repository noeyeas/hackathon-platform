"use client";

import { TeamNumberInput } from "./TeamNumberInput";
import { setPresentationScore } from "../actions";
import { PRESENTATION_MAX } from "@/lib/types";

// 발표 점수 — 운영진이 매긴다(0054). 본선 0~5, 중간발표 0~10.
export function PresentationInput({
  teamId,
  round,
  initial,
}: {
  teamId: string;
  round: "final" | "mid";
  initial: number;
}) {
  const max = PRESENTATION_MAX[round];
  return (
    <TeamNumberInput
      initial={initial}
      max={max}
      label="발표 점수"
      hint={`발표 점수 (0~${max}점, 운영진 입력)`}
      action={(n) => setPresentationScore(teamId, round, n)}
    />
  );
}
