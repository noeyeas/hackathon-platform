-- =============================================================
--  0025 — PII/비밀 컬럼 SELECT 차단 (anon 유출 방지)
--
--  users_self_read / teams_read 가 using(true) 라 anon 키로 전체 행을
--  읽을 수 있고, Supabase 기본 컬럼 SELECT 권한 때문에 이메일·초대코드·
--  팀장코드까지 노출됨(실측 확인). RLS 는 행 단위라 컬럼은 못 가리므로
--  테이블 단위 SELECT 를 회수하고 안전한 컬럼만 재부여한다.
--  (UPDATE 와 동일한 Postgres 규칙: 테이블 권한이 있으면 컬럼 revoke 무효)
--
--  행 정책(using(true))은 유지 — 댓글의 users(name,avatar_url) 조인 등
--  교차 조회가 필요하기 때문. 대신 민감 컬럼만 권한에서 제외한다.
--  운영진용 이메일 조회는 Service Role(RLS/권한 우회)로 이뤄지므로 무관.
-- =============================================================

-- users: email 만 숨김 (name/avatar/role/tech_stack 은 조인·본인조회에 필요)
revoke select on users from anon, authenticated;
grant  select (id, name, avatar_url, role, tech_stack, created_at)
  on users to anon, authenticated;

-- teams: 초대코드/팀장코드/팀장이메일 숨김. 표시에 필요한 컬럼만 부여.
revoke select on teams from anon, authenticated;
grant  select (id, name, tagline, members_note, status, created_by, created_at)
  on teams to anon, authenticated;
