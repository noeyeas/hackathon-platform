-- =============================================================
--  0037 — 응원 수 집계 전용 뷰 (0036 회귀 수정)
--
--  0036 은 liker_key 를 가리려고 project_likes 의 테이블 SELECT 를 회수하고
--  project_id 컬럼만 부여했다. 그런데 count(*) 는 컬럼 단위 권한으로는
--  실행되지 않고 테이블 단위 SELECT 를 요구한다. 그 결과 갤러리·마이페이지의
--  응원 수 집계가 전부 permission denied 로 깨졌다.
--
--  개수는 공개해도 되고 "누가 눌렀는지"만 가리면 되므로, 집계 결과만 내보내는
--  뷰를 두고 화면은 이 뷰를 읽는다.
-- =============================================================

create or replace view project_like_counts as
  select project_id, count(*)::int as likes
  from project_likes
  group by project_id;

-- 뷰는 소유자 권한으로 실행된다(security_invoker 기본값 false). 호출자는
-- project_likes 테이블 권한이 없으므로, 이 설정이어야 집계가 통과한다.
-- 뷰가 내보내는 것은 (project_id, 개수)뿐이라 liker_key 는 여전히 가려진다.
alter view project_like_counts set (security_invoker = false);

grant select on project_like_counts to anon, authenticated;
