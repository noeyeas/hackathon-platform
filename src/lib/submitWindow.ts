// 프로젝트 제출·수정 열림 여부.
// 원천은 DB event_settings.project_submit_open — 운영 대시보드의 토글이 곧 이 값이다.
// teamEdit.ts 와 같은 규칙으로, 값이 없으면 열어둔다(0046 참고).
export function canSubmitProject(open?: boolean | null): boolean {
  return open ?? true;
}
