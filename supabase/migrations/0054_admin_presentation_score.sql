-- =============================================================
--  0054 — '발표' 점수를 심사위원이 아니라 운영진이 매긴다
--
--  운영 결정: 발표(본선 5점 · 중간발표 10점)와 참여도(본선 5점)는 운영진이
--  반영한다. 참여도는 이미 운영진 입력(불참 인원, 0052)이었고, 발표도 같은
--  방식으로 옮긴다.
--
--  · criteria 에서 '발표' 행을 지운다 — 심사위원 채점표는 본선 4개(90점)
--    · 중간 4개(90점)만 남는다. 팀 상호평가도 같은 표를 쓰므로 함께 빠진다.
--    ⚠ judge_scores · team_scores · mid_scores 가 cascade 로 지워지지만,
--    이 시점(9/22) 세 테이블 모두 0행임을 확인했다.
--  · teams.presentation_score(본선, 0~5) · teams.mid_presentation_score
--    (중간, 0~10) 를 운영진이 적는다. teams 의 select 는 컬럼 단위로만 열려
--    있어(0025) 새 컬럼은 서비스 롤 외에는 읽을 수 없다.
--  · 집계: 심사위원 점수를 채점표 배점 합(90)으로 환산한 뒤 발표·참여도를
--    더한다. 세 몫의 배점 합이 100 이라 judge_100 이 곧 100점 만점 총점.
--      본선  judge_100 = 심사 pct × 90 + 발표(0~5) + (5 − 불참 인원, 최소 0)
--      중간  score     = 심사 pct × 90 + 발표(0~10)
--    0052 의 "100점 환산 후 감점" 과 결과는 같고, 참여도가 감점이 아니라
--    배점(5점 만점)으로 드러나 공지 표와 모양이 맞는다.
-- =============================================================

-- ---------- 운영진 입력 컬럼 ----------
-- absent_count 는 0052 에서 생기지만, 0052 를 건너뛴 DB 에서 이 파일만 실행해도
-- 멈추지 않게 여기서도 만들어 둔다(있으면 아무 일도 없다).
alter table teams
  add column if not exists absent_count int not null default 0
    check (absent_count >= 0);

alter table teams
  add column if not exists presentation_score int not null default 0
    check (presentation_score between 0 and 5),
  add column if not exists mid_presentation_score int not null default 0
    check (mid_presentation_score between 0 and 10);

-- ---------- 심사위원 채점표에서 '발표' 제거 ----------
delete from criteria where name = '발표';

-- ---------- 본선 집계 ----------
drop view if exists rankings;

create view rankings as
with
jmax as (
  -- 심사위원 채점표 배점 합(90). 기준이 바뀌어도 따라간다.
  select coalesce(sum(max_score), 0)::numeric as total
  from criteria where round = 'final'
),
judge_norm as (
  select p.id as project_id,
         coalesce(sum(js.score::numeric) / nullif(sum(jc.max_score::numeric), 0), 0) * jm.total
           + t.presentation_score
           + greatest(5 - t.absent_count, 0)
           as judge_100,
         t.absent_count,
         t.presentation_score
  from projects p
  join teams t on t.id = p.team_id
  cross join jmax jm
  left join judge_scores js on js.project_id = p.id
  left join criteria jc on jc.id = js.criteria_id and jc.round = 'final'
  group by p.id, t.absent_count, t.presentation_score, jm.total
),
team_norm as (
  select p.id as project_id,
         coalesce(sum(ts.score::numeric) / nullif(sum(tc.max_score::numeric), 0) * 100, 0) as team_100
  from projects p
  left join team_scores ts on ts.project_id = p.id
  left join criteria tc on tc.id = ts.criteria_id and tc.round = 'final'
  group by p.id
),
audience_cnt as (
  select p.id as project_id, count(av.ballot_code)::int as votes
  from projects p
  left join audience_votes av on av.project_id = p.id
  group by p.id
),
cfg as (
  select
    (weights->>'judge')::numeric              as w_judge,
    (weights->>'team')::numeric               as w_team,
    coalesce((weights->>'audience')::numeric, 0) as w_audience,
    finalist_count
  from event_settings where id = 1
),
stage1 as (
  select
    p.id as project_id,
    jn.judge_100,
    jn.absent_count,
    jn.presentation_score,
    tn.team_100,
    round(
      (jn.judge_100 * c.w_judge + tn.team_100 * c.w_team)
      / nullif(c.w_judge + c.w_team, 0)
    , 2) as stage1_score
  from projects p
  join judge_norm jn on jn.project_id = p.id
  join team_norm tn on tn.project_id = p.id
  cross join cfg c
),
ranked as (
  select
    s.*,
    row_number() over (
      order by s.stage1_score desc, s.judge_100 desc, s.team_100 desc, s.project_id
    ) as stage1_rank
  from stage1 s
),
top_votes as (
  select coalesce(max(ac.votes), 0) as max_votes
  from ranked r
  join audience_cnt ac on ac.project_id = r.project_id
  cross join cfg c
  where r.stage1_rank <= c.finalist_count
),
scored as (
  select
    r.*,
    ac.votes,
    (r.stage1_rank <= c.finalist_count) as is_finalist,
    case
      when r.stage1_rank <= c.finalist_count then
        round(
          r.judge_100 * c.w_judge
          + r.team_100 * c.w_team
          + (ac.votes::numeric / nullif(tv.max_votes, 0) * 100) * c.w_audience
        , 2)
      else r.stage1_score
    end as final_score
  from ranked r
  join audience_cnt ac on ac.project_id = r.project_id
  cross join cfg c
  cross join top_votes tv
)
select
  p.id                        as project_id,
  t.id                        as team_id,
  t.name                      as team_name,
  p.title,
  round(s.judge_100, 1)       as judge_score,
  s.absent_count,
  s.presentation_score,
  round(s.team_100, 1)        as team_votes,
  s.votes                     as audience_votes,
  coalesce(s.final_score, s.stage1_score) as final_score,
  s.stage1_rank,
  s.is_finalist
from projects p
join teams t on t.id = p.team_id
join scored s on s.project_id = p.id
order by
  s.is_finalist desc,
  case when s.is_finalist then coalesce(s.final_score, s.stage1_score) end desc nulls last,
  case when s.is_finalist then s.votes end desc nulls last,
  s.stage1_rank,
  t.name asc;

revoke select on rankings from anon, authenticated;

-- ---------- 중간발표 집계 ----------
drop view if exists mid_rankings;

create view mid_rankings as
with mmax as (
  select coalesce(sum(max_score), 0)::numeric as total
  from criteria where round = 'mid'
)
select
  t.id   as team_id,
  t.name as team_name,
  round(
    coalesce(sum(ms.score::numeric) / nullif(sum(c.max_score::numeric), 0), 0) * mm.total
    + t.mid_presentation_score
  , 1)                                   as judge_score,
  t.mid_presentation_score               as presentation_score,
  count(distinct ms.judge_id)::int       as judge_count
from teams t
cross join mmax mm
left join mid_scores ms on ms.team_id = t.id
left join criteria c on c.id = ms.criteria_id and c.round = 'mid'
group by t.id, t.name, t.mid_presentation_score, mm.total
order by judge_score desc, t.name asc;

revoke select on mid_rankings from anon, authenticated;
