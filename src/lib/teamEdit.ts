// 팀 정보(한줄설명·팀원) 수정 열림 여부.
// 원천은 DB event_settings.team_edit_open — 운영 대시보드의 토글이 곧 이 값이다.
// 값을 못 읽었으면(null) 열어둔다. 조회 실패나 컬럼 누락 때문에 참가자가
// 아무것도 못 하게 되는 쪽이, 잠깐 더 열려 있는 쪽보다 사고가 크다.
// 닫는 판단은 언제나 운영진이 한다.
export function canEditTeam(open?: boolean | null): boolean {
  return open ?? true;
}
