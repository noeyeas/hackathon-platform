-- =============================================================
--  0033 — 제출 마감 강제
--
--  event_settings.submit_deadline 은 0001 부터 있었지만 앱도 RLS 도
--  한 번도 읽지 않아 사실상 죽은 컬럼이었다. 그 결과 팀장은 투표·심사가
--  진행되는 중에도, 대회가 끝난 뒤에도 제출물을 계속 고칠 수 있었다.
--  채점 근거가 되는 자료이므로 시점을 강제한다.
--
--  방어선은 두 겹:
--   (1) 앱  — submit/actions.ts 의 canSubmitProject()
--   (2) RLS — 아래 정책. anon 키로 REST 를 직접 때려도 막힌다.
--
--  운영진(Service Role)은 RLS 를 우회하므로 마감 후에도 손댈 수 있다.
-- =============================================================

-- ---------- 마감 시각 기본값 ----------
-- 최종 발표(9.18–9.19 무박 2일) 시작 시점에 맞춘 값이다.
-- ※ 실제 발표 시작 시각에 맞춰 운영진이 확인·조정할 것.
--   변경은 재배포 없이: update event_settings set submit_deadline = '...' where id = 1;
update event_settings
  set submit_deadline = '2026-09-19T09:00:00+09:00'
  where id = 1 and submit_deadline is null;

-- ---------- projects 쓰기: 팀장 + 마감 전 ----------
-- 마감이 설정되지 않았으면(null) 열어둔다 — 값이 비었다고 제출을 잠그면
-- 대회 당일 아무도 제출하지 못하는 상황이 된다. 잠그는 판단은 운영진이 한다.
create or replace function submit_open() returns boolean as $$
  select coalesce(
    (select submit_deadline > now() from event_settings where id = 1),
    true
  );
$$ language sql stable security definer set search_path = public;

drop policy if exists projects_write on projects;
create policy projects_write on projects for all
  using (
    submit_open()
    and exists (select 1 from team_members m
                where m.team_id = projects.team_id
                  and m.user_id = auth.uid() and m.is_leader)
  )
  with check (
    submit_open()
    and exists (select 1 from team_members m
                where m.team_id = projects.team_id
                  and m.user_id = auth.uid() and m.is_leader)
  );

-- 운영진이 주민 득표수(audience_votes_manual)를 넣는 경로는 Service Role 이라
-- 위 정책의 영향을 받지 않는다. 일반 사용자에겐 애초에 컬럼 권한이 없다.
