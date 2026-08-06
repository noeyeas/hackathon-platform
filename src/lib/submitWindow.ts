// 프로젝트 제출·수정 마감.
// 원천은 DB event_settings.submit_deadline (0033 에서 값을 넣는다).
// teamEdit.ts 와 같은 방식이지만 폴백 기본값을 두지 않는다 — 마감이 설정되지
// 않은 상태에서 코드 상수로 제출을 막아버리면 대회 당일 손쓸 방법이 없다.
// 값이 없으면 "마감 미설정"으로 보고 열어두고, 잠그는 판단은 운영진이 한다.
export function canSubmitProject(
  deadlineIso?: string | null,
  now: Date = new Date()
): boolean {
  if (!deadlineIso) return true;
  return now.getTime() < new Date(deadlineIso).getTime();
}
