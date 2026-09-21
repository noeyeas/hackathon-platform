"use client";

import { Switch } from "../OpenControls";
import { setMidJudgingOpen } from "../actions";

// 중간발표 채점 스위치. 본선 '온라인 투표' 토글과 별개 — 9.28 에는 이것만 연다.
export function MidControls({ open }: { open: boolean }) {
  return (
    <Switch
      title="중간발표 채점"
      desc="심사위원이 중간발표 채점 화면에서 점수를 저장할 수 있습니다. 본선 채점·팀 상호평가와는 무관합니다."
      initial={open}
      action={setMidJudgingOpen}
    />
  );
}
