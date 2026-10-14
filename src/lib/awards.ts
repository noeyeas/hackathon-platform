// 최종 수상팀 — 운영진이 외부 집계 시트(심사위원 50% · 팀 상호평가 25% · 주민투표 25%)로
// 확정한 결과다. 사이트의 rankings 뷰에는 심사 점수와 전시 코인 투표가 들어 있지 않아
// (둘 다 사이트 밖에서 집계) 수상팀을 계산할 수 없으므로, 결과 페이지와 갤러리 수상
// 배지는 이 고정 명단을 따른다. 배열 순서 = AWARD_LABELS 순서(노원구청장상 → 총장상 ×3).
export const FINAL_AWARD_TEAM_NUMBERS: readonly number[] = [23, 13, 24, 29];

// 중간발표(9.28) 심사로 선정해 본선 개회식에서 시상한 매니패스트상.
export const MANYFAST_AWARD_TEAM_NUMBER = 24;
