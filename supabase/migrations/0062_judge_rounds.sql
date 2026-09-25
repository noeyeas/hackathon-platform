-- =============================================================
--  0062 — 라운드별 심사위원단 + 미채점 팀 구분
--
--  운영 결정(9/26): 중간발표와 본선의 심사위원단이 다르다.
--    중간(9/28) — 박규동 교수님, 허재혁 대표님
--    본선(10/9) — 박영재 교수님, 신유안 교수님, 허재혁 대표님, 김태헌님
--  허재혁 대표님만 두 라운드 모두 참여한다.
--
--  0055 의 judge_emails 는 라운드 구분이 없는 평면 명부라, 채점표 입력
--  화면이 두 라운드 모두에 5명을 전부 띄웠다. 오지 않은 심사위원 칸이
--  빈 채로 남아 헷갈리고, 엉뚱한 칸에 옮겨 적을 위험이 있다.
--
--  명부(judge_emails)는 그대로 두고 배정만 따로 둔다 — 한 분이 두 라운드에
--  들어가는 경우가 실제로 있어서, 명부에 round 컬럼을 넣는 방식으로는
--  같은 사람을 두 번 적어야 한다.
-- =============================================================

create table if not exists judge_rounds (
  round text not null check (round in ('mid', 'final')),
  email text not null references judge_emails(email) on delete cascade,
  primary key (round, email)
);

-- 점수와 같은 급의 운영 정보다. 정책을 두지 않는다 = 서비스 롤 전용
-- (judge_emails · judge_sheets · rankings 와 같은 방식).
alter table judge_rounds enable row level security;

insert into judge_rounds (round, email) values
  ('mid',   'kdpark.kw@gmail.com'),       -- 박규동 교수님
  ('mid',   'leo@manyfast.io'),           -- 허재혁 대표님 (매니패스트)
  ('final', 'youngjae.park@kw.ac.kr'),    -- 박영재 교수님
  ('final', 'uanshin@kw.ac.kr'),          -- 신유안 교수님
  ('final', 'leo@manyfast.io'),           -- 허재혁 대표님 (두 라운드 모두)
  ('final', 'kim01030048361@gmail.com')   -- 김태헌님 (주민단체 대표)
on conflict do nothing;

-- 배정되지 않은 심사위원 칸에는 점수가 들어갈 수 없게 막는다. 화면에서
-- 이미 안 보이지만, 명부를 바꾼 뒤 남은 행이 조용히 평균에 섞이는 쪽이
-- 훨씬 찾기 어렵다.
--
-- on delete restrict — 점수가 들어간 심사위원을 명단에서 빼려고 하면
-- 조용히 지우지 말고 에러를 내야 한다. 채점표는 다시 만들 수 없다.
alter table judge_sheets
  drop constraint if exists judge_sheets_round_judge_fkey;
alter table judge_sheets
  add constraint judge_sheets_round_judge_fkey
  foreign key (round, judge_email) references judge_rounds (round, email)
  on delete restrict;

-- ---------- 표시용 명부 (라운드별, 명부 등록순) ----------
-- 화면은 이 뷰만 읽는다. 조인과 정렬을 매번 손으로 짜지 않게.
create or replace view judge_roster as
  select r.round, r.email, e.name, e.created_at
  from judge_rounds r
  join judge_emails e on e.email = r.email;

revoke select on judge_roster from anon, authenticated;
