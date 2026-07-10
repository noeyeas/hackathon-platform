-- =============================================================
--  0026 — 팀 수정 마감일 설정화 + 조회수 RPC 남용 차단
-- =============================================================

-- (1) 팀 정보 수정 마감일을 코드 상수에서 DB 설정으로 이관.
--     앱은 event_settings.team_edit_deadline 을 우선 사용하고, 없으면
--     코드 기본값(DEFAULT_TEAM_EDIT_DEADLINE)으로 폴백한다.
alter table event_settings
  add column if not exists team_edit_deadline timestamptz;

update event_settings
  set team_edit_deadline = '2026-09-03T00:00:00+09:00'
  where id = 1 and team_edit_deadline is null;

-- (2) 조회수 RPC 는 서버 액션(Service Role)에서만 호출하도록 잠근다.
--     이전엔 anon/authenticated 가 REST 로 직접 호출해 무제한 증가 가능.
--     앱은 pingView 에서 Service Role 로 호출 + 세션당 1회로 제한한다.
revoke execute on function increment_project_view(uuid) from anon, authenticated;
