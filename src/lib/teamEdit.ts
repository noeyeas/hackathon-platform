// 팀 정보(이름·한줄설명·팀원) 수정 마감.
// 2026-09-03 00:00 KST 이전까지 수정 가능(= 9월 2일 자정까지).
export const TEAM_EDIT_DEADLINE = new Date("2026-09-03T00:00:00+09:00");

export function canEditTeam(now: Date = new Date()): boolean {
  return now.getTime() < TEAM_EDIT_DEADLINE.getTime();
}
