-- =============================================================
--  0021 — RLS 경계 강화 (권한 상승 차단)
--  anon 키가 클라이언트에 노출되므로 로그인 사용자는 REST API를
--  직접 호출할 수 있다. 서버 액션의 role/팀장 검증만으로는 부족하고
--  RLS가 실제 방어선이어야 한다. 0001의 과도하게 느슨한 정책을 조인다.
--
--  적용 후 확인: 참가자 계정으로
--   - PATCH users?id=eq.<self> {"role":"admin"}  → 거부돼야 함
--   - PATCH teams / team_members 임의 행           → 거부돼야 함
-- =============================================================

-- ---------- #1 users: 본인도 role/email 은 못 바꾸게 ----------
-- role/email 변경은 운영진이 Supabase(Service Role)에서만. 본인은
-- name/avatar/tech_stack 등만 수정 가능하도록 컬럼 단위로 차단한다.
drop policy if exists users_self_update on users;
create policy users_self_update on users for update
  using (id = auth.uid())
  with check (id = auth.uid());

revoke update (role, email) on users from authenticated, anon;
revoke insert (role)        on users from authenticated, anon;

-- ---------- #2 teams: 소속 팀만, 그것도 안전한 컬럼만 ----------
-- 팀 생성/삭제는 운영진(Service Role) 전용 → authenticated 쓰기 정책 제거.
-- 소속 멤버는 UPDATE 가능하되 이름/코드/상태/팀장이메일은 컬럼 차단.
-- (앱의 팀장 인라인 수정은 tagline/members_note 만 건드림)
drop policy if exists teams_write on teams;
create policy teams_update on teams for update
  using (
    exists (select 1 from team_members m
            where m.team_id = teams.id and m.user_id = auth.uid())
  )
  with check (
    exists (select 1 from team_members m
            where m.team_id = teams.id and m.user_id = auth.uid())
  );

revoke update (name, invite_code, status, leader_email, created_by)
  on teams from authenticated, anon;

-- ---------- #3 team_members: 일반 사용자 쓰기 전면 차단 ----------
-- 팀장 연결(ensureLeaderMembership)은 Service Role 로만 이뤄지고,
-- 앱에 일반 클라이언트로 team_members 를 쓰는 경로가 없다.
-- is_leader 자가 승격을 막기 위해 authenticated 쓰기 정책을 제거한다.
drop policy if exists members_write on team_members;
-- (members_read = select using(true) 는 그대로 유지)

-- ---------- #4(부분): projects 쓰기를 팀장으로 한정 ----------
-- 기존 projects_write 는 팀의 아무 멤버나 허용했으나, 앱은 팀장만
-- 제출한다(submit/actions.ts). RLS 도 팀장으로 좁힌다.
drop policy if exists projects_write on projects;
create policy projects_write on projects for all
  using (
    exists (select 1 from team_members m
            where m.team_id = projects.team_id
              and m.user_id = auth.uid() and m.is_leader)
  )
  with check (
    exists (select 1 from team_members m
            where m.team_id = projects.team_id
              and m.user_id = auth.uid() and m.is_leader)
  );
