// 팀 정보(이름·한줄설명·팀원) 수정 마감.
// 원천은 DB event_settings.team_edit_deadline. DB 값이 없을 때만 아래 기본값
// 사용(안전 폴백). 날짜 변경은 코드 재배포 없이 event_settings 수정으로 처리.
export const DEFAULT_TEAM_EDIT_DEADLINE = "2026-09-03T00:00:00+09:00";

export function canEditTeam(
  deadlineIso?: string | null,
  now: Date = new Date()
): boolean {
  const deadline = deadlineIso ?? DEFAULT_TEAM_EDIT_DEADLINE;
  return now.getTime() < new Date(deadline).getTime();
}
