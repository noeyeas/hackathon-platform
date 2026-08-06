-- =============================================================
--  0036 — 개인 연락처·응원 기록 공개 차단
--
--  anon 키는 클라이언트에 노출되므로 "화면에 안 그린다"는 방어가 아니다.
--  누구나 REST 를 직접 호출해 아래를 통째로 긁어갈 수 있었다:
--    GET /rest/v1/recruit_posts?select=author_name,contact
--    GET /rest/v1/project_likes?select=project_id,liker_key
--
--  0025 와 같은 방식으로 컬럼 권한을 조인다.
-- =============================================================

-- ---------- (1) 모집글 연락처: 로그인 사용자만 ----------
-- contact 는 참가자가 적어둔 카톡 ID·전화번호다. 모집 게시판 자체는 비로그인
-- 방문자도 볼 수 있어야 하므로(신청 전 분위기 파악), 글은 열어두고 연락처
-- 컬럼만 authenticated 로 제한한다. 검색엔진·스크래퍼에게서 떼어내는 게 목적.
revoke select on recruit_posts from anon, authenticated;
grant  select (
  id, team_id, title, body, positions, is_open,
  kind, author_id, author_name, created_at
) on recruit_posts to anon, authenticated;
grant  select (contact) on recruit_posts to authenticated;

-- ---------- (2) 응원(좋아요) 기록: 집계만 공개 ----------
-- liker_key 는 "user:<uid>" 라, 공개되면 누가 어느 작품을 응원했는지
-- 그대로 드러난다(팀 간 견제 소지). 갤러리는 개수만 쓰므로 project_id 만
-- 남긴다 — count(*) 는 컬럼 하나에 대한 권한만 있으면 동작한다.
-- 본인 응원 여부 확인은 서버(Service Role)에서 한다.
revoke select on project_likes from anon, authenticated;
grant  select (project_id) on project_likes to anon, authenticated;
