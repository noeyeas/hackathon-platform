"use client";

import { TeamNumberInput } from "./TeamNumberInput";
import { setAbsentCount } from "../actions";

// 참여도 — 팀별 불참 인원(개회식·최종발표 연인원). rankings 뷰가
// 5점에서 인당 1점을 뺀다(0052, 0054).
export function AbsentInput({ teamId, initial }: { teamId: string; initial: number }) {
  return (
    <TeamNumberInput
      initial={initial}
      max={99}
      label="불참 인원"
      hint="불참 인원 (인당 1점 감점, 참여도 5점 만점)"
      action={(n) => setAbsentCount(teamId, n)}
    />
  );
}
