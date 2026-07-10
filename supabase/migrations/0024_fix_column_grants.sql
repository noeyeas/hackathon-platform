-- =============================================================
--  0024 — 0021 컬럼 차단 보정 (실효성 있는 방식으로)
--
--  0021 은 `revoke update (role, email) on users` 를 썼으나, 대상 롤이
--  테이블 단위 UPDATE 권한을 갖고 있으면 컬럼 단위 revoke 는 무시된다
--  (Postgres 규칙). 실제로 참가자 JWT 로 users.role 을 admin 으로 바꾸는
--  공격이 성공함을 확인. → 테이블 단위 UPDATE 를 회수한 뒤 안전한 컬럼만
--  다시 GRANT 하는 방식으로 바꾼다.
--
--  적용 후: 참가자 JWT 로 PATCH users {"role":"admin"} → 거부돼야 함.
-- =============================================================

-- users: 앱은 일반 클라이언트로 users 를 쓰지 않는다(role 변경은 운영진이
-- 대시보드/Service Role 로). 테이블 단위 UPDATE/INSERT 를 전부 회수한다.
-- (회원가입 시 users 행 생성은 security definer 트리거가 하므로 영향 없음)
revoke update on users from public, anon, authenticated;
revoke insert on users from public, anon, authenticated;

-- teams: 팀장 인라인 수정(tagline/members_note)만 허용. 이름/코드/상태/
-- 팀장이메일 등은 회수. 테이블 단위 UPDATE 를 회수하고 안전 컬럼만 재부여.
revoke update on teams from public, anon, authenticated;
grant  update (tagline, members_note) on teams to authenticated;
