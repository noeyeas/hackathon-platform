-- =============================================================
--  테스트 데이터 정리 — 본선 데이터를 넣기 전 한 번 실행한다.
--
--  실행: Supabase → SQL Editor 에 붙여넣고, 아래 순서대로 진행할 것.
--        (마이그레이션이 아니므로 migrations/ 에 두지 않는다)
--
--    1단계  "확인" 블록만 먼저 실행해서 지워질 양을 눈으로 본다.
--    2단계  숫자가 예상과 맞으면 "삭제" 블록을 실행한다.
--
--  되돌릴 수 없다. 실행 전에 Supabase 대시보드에서 백업(또는
--  Database → Backups 의 시점 복구 가능 여부)을 먼저 확인할 것.
--
--  남기는 것 (설정이지 테스트 데이터가 아니다):
--    event_settings  — 대회 설정 한 줄
--    criteria        — 심사 기준
--  삭제 후 event_settings 의 각종 스위치·가중치는 운영 대시보드에서
--  본선 시작 상태로 다시 맞춰 줄 것.
-- =============================================================


-- =============================================================
--  1단계 — 확인 (읽기만 한다. 먼저 이것만 실행)
-- =============================================================
-- 아직 적용되지 않은 마이그레이션이 있을 수 있으므로(예: 0045 의 주민투표
-- 테이블), 없는 테이블은 건너뛰고 있는 것만 센다.
select t as "테이블",
       (xpath('/row/c/text()',
              query_to_xml(format('select count(*) as c from %I', t),
                           false, true, '')))[1]::text::int as "행 수"
from unnest(array[
  'teams','projects','team_members','users',
  'judge_scores','team_scores','votes','audience_tokens',
  'audience_ballots','audience_votes',
  'project_likes','project_comments','project_view_log',
  'announcements','recruit_posts','milestones'
]) as t
where to_regclass('public.' || quote_ident(t)) is not null
order by 1;

-- 지워질 팀 목록도 한 번 훑어본다. 남겨야 할 실제 팀이 섞여 있지 않은지 확인.
select id, name, leader_email, status, created_at from teams order by created_at;


-- =============================================================
--  2단계 — 삭제
--  (위 확인 결과가 예상과 맞을 때만 여기부터 실행)
--
--  전체가 하나의 DO 블록이라 도중에 실패하면 아무것도 지워지지 않는다.
-- =============================================================
-- 삭제 순서: 참조하는 쪽 → 참조받는 쪽. 대부분 on delete cascade 가 걸려
-- 있지만, 무엇이 지워지는지 눈에 보이도록 전부 명시해서 지운다.
-- 아직 없는 테이블은 조용히 건너뛴다.
do $$
declare
  t text;
begin
  foreach t in array array[
    -- 투표·점수
    'audience_votes',    -- 주민 온라인 투표 표 (0045)
    'audience_ballots',  -- 발급된 QR 투표권 (0045)
    'votes',             -- 팀 상호 + 관객 투표 (구버전 경로)
    'audience_tokens',   -- 테이블별 QR 토큰 (구버전 경로)
    'judge_scores',      -- 심사위원 채점
    'team_scores',       -- 팀 상호 채점
    -- 제출작에 붙은 것
    'project_comments',
    'project_likes',
    'project_view_log',  -- 갤러리 조회 로그 (view_count 원본)
    -- 게시물
    'announcements',
    'recruit_posts',
    'milestones',        -- 일정. 본선 일정을 새로 넣을 거라면 함께 비운다.
    -- 제출작 · 팀
    'projects',
    'team_members',
    'teams'
  ] loop
    if to_regclass('public.' || quote_ident(t)) is null then
      raise notice '건너뜀 (테이블 없음): %', t;
      continue;
    end if;
    execute format('delete from public.%I', t);
    raise notice '비움: %', t;
  end loop;
end $$;


-- =============================================================
--  3단계 — 테스트 계정 (선택. 위와 분리해서 판단할 것)
--
--  users 는 auth.users 를 참조하고 on delete cascade 로 묶여 있으므로,
--  로그인 계정까지 지우려면 auth.users 를 지워야 public.users 도 함께
--  사라진다. 운영진·심사위원 계정까지 날리지 않도록 반드시 목록을
--  먼저 확인하고, 지울 이메일을 직접 적을 것.
-- =============================================================
-- 확인:
-- select id, email, name, role, created_at from users order by created_at;

-- 삭제 (지울 이메일을 아래 목록에 직접 채워 넣을 것):
-- delete from auth.users
--  where email in (
--    'test1@example.com',
--    'test2@example.com'
--  );

-- 데모 시드(seed_demo.sql) 계정만 정리한다면:
-- delete from auth.users where email like '%@demo.local';


-- =============================================================
--  4단계 — 썸네일 파일 (선택)
--
--  projects 를 지워도 Storage 의 thumbnails 버킷에 올라간 이미지는
--  그대로 남는다. Supabase 대시보드 → Storage → thumbnails 에서
--  남은 파일을 확인하고 지울 것.
-- =============================================================
