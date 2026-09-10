-- =============================================================
--  0046 — 팀 정보 수정·프로젝트 제출을 날짜가 아니라 스위치로 잠근다
--
--  기존: event_settings.team_edit_deadline / submit_deadline 시각을 넘기면
--        앱과 RLS 가 자동으로 잠갔다. 실제 운영에서는 발표가 밀리거나
--        한 팀만 늦게 받아주는 일이 생기는데, 그때마다 운영진이 SQL 로
--        시각을 고쳐야 했다(코드 기본값 폴백까지 있어 더 헷갈렸다).
--  변경: 운영 대시보드의 토글이 곧 상태다. 열림/닫힘 두 값만 본다.
--
--  방어선은 0033 과 같은 두 겹으로 유지한다:
--   (1) 앱  — canEditTeam() / canSubmitProject()
--   (2) RLS — 아래 team_edit_open() / submit_open()
--  운영진(Service Role)은 RLS 를 우회하므로 닫은 뒤에도 손댈 수 있다.
-- =============================================================

-- ---------- 스위치 ----------
-- 기본값은 열림. 대회 시작 시점에 참가자가 아무것도 못 하는 상태로
-- 시작하는 것보다, 열어두고 운영진이 닫는 편이 사고가 작다.
alter table event_settings
  add column if not exists team_edit_open      boolean not null default true,
  add column if not exists project_submit_open boolean not null default true;

-- 지금 걸려 있던 마감 시각을 그대로 옮긴다 — 이미 지난 마감은 닫힘으로.
-- 두 컬럼은 서로 다른 마이그레이션(0026 / 0001·0033)에서 생겼고, 이 DB 처럼
-- 한쪽만 있거나 둘 다 없는 상태가 실제로 나온다. 없으면 옮길 값도 없으므로
-- 위에서 정한 기본값(열림)을 그대로 둔다 — 컬럼이 없다고 마이그레이션이
-- 통째로 멈추면 대회 당일 손쓸 방법이 없다.
do $$
declare
  has_team_edit boolean;
  has_submit    boolean;
begin
  select count(*) filter (where column_name = 'team_edit_deadline') > 0,
         count(*) filter (where column_name = 'submit_deadline')    > 0
    into has_team_edit, has_submit
  from information_schema.columns
  where table_schema = 'public' and table_name = 'event_settings';

  if has_team_edit then
    execute 'update event_settings
                set team_edit_open = coalesce(team_edit_deadline > now(), true)
              where id = 1';
  else
    raise notice 'team_edit_deadline 없음 — team_edit_open 은 기본값(열림) 유지';
  end if;

  if has_submit then
    execute 'update event_settings
                set project_submit_open = coalesce(submit_deadline > now(), true)
              where id = 1';
  else
    raise notice 'submit_deadline 없음 — project_submit_open 은 기본값(열림) 유지';
  end if;
end $$;

-- 마감 시각 컬럼은 걷어낸다. 남겨두면 0033 이 겪은 "아무도 읽지 않는
-- 컬럼"이 다시 생겨 어느 쪽이 진짜인지 모르게 된다.
alter table event_settings
  drop column if exists team_edit_deadline,
  drop column if exists submit_deadline;

-- ---------- projects 쓰기: 팀장 + 제출 열림 ----------
create or replace function submit_open() returns boolean as $$
  select coalesce(
    (select event_settings.project_submit_open from event_settings where id = 1),
    true
  );
$$ language sql stable security definer set search_path = public;

-- ---------- teams 쓰기: 소속 멤버 + 팀 수정 열림 ----------
-- 0021 의 teams_update 에 스위치 조건만 더한다. 컬럼 권한(name·status 등
-- 회수)은 그대로 살아 있으므로 여기서는 행 조건만 본다.
create or replace function team_edit_open() returns boolean as $$
  select coalesce(
    (select event_settings.team_edit_open from event_settings where id = 1),
    true
  );
$$ language sql stable security definer set search_path = public;

drop policy if exists teams_update on teams;
create policy teams_update on teams for update
  using (
    team_edit_open()
    and exists (select 1 from team_members m
                where m.team_id = teams.id and m.user_id = auth.uid())
  )
  with check (
    team_edit_open()
    and exists (select 1 from team_members m
                where m.team_id = teams.id and m.user_id = auth.uid())
  );
