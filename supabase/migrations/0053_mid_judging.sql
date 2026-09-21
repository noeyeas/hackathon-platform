-- =============================================================
--  0053 — 중간발표(9.28 예선) 심사를 사이트에서 받는다
--
--  중간발표는 디스코드 공지 기준 별도 심사표(합계 100점)로 매니패스트상
--  1팀을 뽑는다. 지금까지는 홈 안내 문구에만 적혀 있고 채점은 사이트 밖
--  (수기)이었다. 본선과 같은 심사 화면으로 받되, 본선 집계(rankings)에는
--  단 1점도 섞이지 않게 저장소를 나눈다.
--
--  1. criteria.round — 심사표가 중간('mid')인지 본선('final')인지.
--     테이블을 새로 만들지 않고 컬럼 하나로 나눈 이유: 채점 화면(ScoreCard)
--     ·진행률(scoring.ts)이 criteria 행 모양을 그대로 쓰므로 코드가 같다.
--     ⚠ 기존 criteria 조회는 모두 round 로 걸러야 한다(앱에서 처리).
--
--  2. mid_scores — 중간발표 채점. judge_scores 와 달리 대상이 project 가
--     아니라 team 이다. 9.28 시점엔 제출물이 없는 팀이 대부분인데 중간발표는
--     모든 팀이 하므로, 제출물에 묶으면 채점할 수 없는 팀이 생긴다.
--     본선 집계(rankings)는 judge_scores 만 읽으므로 이 테이블은 본선
--     점수에 영향이 없다.
--
--  3. event_settings.mid_judging_open — 중간 채점 ON/OFF. 본선 스위치
--     (voting_open)와 따로 둔다. 9.28 과 10.9 는 다른 날이라 하나로 묶으면
--     중간 채점을 열 때 본선 화면까지 같이 열린다.
--
--  4. mid_rankings 뷰 — 팀별 중간 점수(100점 환산). rankings 처럼 서비스 롤
--     전용이다 — 매니패스트상 발표 전에 참가자·심사위원에게 새지 않게.
-- =============================================================

-- ---------- 1. 심사표 구분 ----------
alter table criteria
  add column if not exists round text not null default 'final'
  check (round in ('mid', 'final'));

-- 중간발표 심사표(디스코드 공지 1️⃣-2). 합계 100점.
-- 0039 와 같은 이유로 배점을 max_score 에 넣는다 — 집계는
-- sum(score)/sum(max_score) 정규화라 max_score 가 곧 가중치다.
-- 두 번 실행해도 중복 삽입되지 않게 이름으로 거른다.
insert into criteria (name, max_score, weight, sort, description, round)
select v.name, v.max_score, v.weight, v.sort, v.description, 'mid'
from (values
  ('논리의 연결성',          30, 30, 1, '문제 정의 → 해결 방안 → 기대 효과가 빈틈없이 이어지는지'),
  ('실현 & 상용화 가능성',   20, 20, 2, '실제 환경에서 구현·활용될 수 있는지, 서비스·제품으로 발전할 가능성'),
  ('기획 문서의 재현 가능성', 20, 20, 3, '기획 문서만 보고도 같은 결과물을 만들 수 있을 만큼 구체적인지'),
  ('창의성 & 차별성',        20, 20, 4, '기존 서비스·해결방안 대비 독창성과 차별화된 특징'),
  ('발표',                  10, 10, 5, '목적·주요 내용·계획을 명확하고 효과적으로 전달하는지')
) as v(name, max_score, weight, sort, description)
where not exists (
  select 1 from criteria c where c.round = 'mid' and c.name = v.name
);

-- ---------- 2. 중간발표 채점 ----------
create table if not exists mid_scores (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references teams(id) on delete cascade,
  judge_id    uuid not null references users(id) on delete cascade,
  criteria_id uuid not null references criteria(id) on delete cascade,
  score       int not null check (score >= 0),
  comment     text,
  updated_at  timestamptz not null default now(),
  unique (team_id, judge_id, criteria_id)
);

-- 본선 심사표를 중간 채점에 섞어 넣는 실수를 DB 에서 막는다. 앱도 거르지만
-- 서비스 롤로 쓰므로 RLS 는 못 막는다 — 트리거가 마지막 방어선이다.
create or replace function mid_scores_round_guard() returns trigger as $$
begin
  if (select round from criteria where id = new.criteria_id) is distinct from 'mid' then
    raise exception '중간발표 심사표가 아닌 기준입니다';
  end if;
  return new;
end; $$ language plpgsql set search_path = public;

drop trigger if exists mid_scores_round_guard on mid_scores;
create trigger mid_scores_round_guard
  before insert or update on mid_scores
  for each row execute function mid_scores_round_guard();

-- RLS 는 judge_scores(0001)와 같은 모양 — 본인 것만, 운영진 전체.
alter table mid_scores enable row level security;

drop policy if exists mid_scores_read on mid_scores;
create policy mid_scores_read on mid_scores for select
  using (judge_id = auth.uid() or is_admin());

drop policy if exists mid_scores_write on mid_scores;
create policy mid_scores_write on mid_scores for all
  using (judge_id = auth.uid() and (select role from users where id = auth.uid()) = 'judge')
  with check (judge_id = auth.uid());

-- ---------- 3. 스위치 ----------
alter table event_settings
  add column if not exists mid_judging_open boolean not null default false;

-- ---------- 4. 집계 ----------
drop view if exists mid_rankings;
create view mid_rankings as
select
  t.id   as team_id,
  t.name as team_name,
  round(
    coalesce(sum(ms.score::numeric) / nullif(sum(c.max_score::numeric), 0) * 100, 0)
  , 1)                                   as judge_score,
  count(distinct ms.judge_id)::int       as judge_count
from teams t
left join mid_scores ms on ms.team_id = t.id
left join criteria c on c.id = ms.criteria_id
group by t.id, t.name
-- 1위가 매니패스트상. 동점이면 팀 이름순 — 운영진이 표를 보고 직접 정한다.
order by judge_score desc, t.name asc;

revoke select on mid_rankings from anon, authenticated;
