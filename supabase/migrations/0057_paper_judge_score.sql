-- =============================================================
--  0057 — 심사위원 종이 채점 → 운영진이 팀별 심사 점수(90점 만점)를 적는다
--
--  운영 결정(9/22): 심사위원은 웹이 아니라 종이 채점표로 채점한다. 운영진이
--  심사위원별 채점표를 모아 팀별 평균(4항목 합, 90점 만점)을 내고 그 숫자
--  하나를 여기 적는다. 발표·참여도는 0054 그대로 운영진이 따로 적는다.
--
--  · teams.judge_paper_score      — 본선 심사 평균 (0~90, 소수 1자리, null = 미입력)
--  · teams.mid_judge_paper_score  — 중간발표 심사 평균 (0~90, 같은 규칙)
--  · 집계: 종이 점수가 있으면 그것을 90점 몫으로 쓰고, 없으면 웹 채점
--    (judge_scores · mid_scores)을 90점으로 환산한 값을 쓴다. 웹 채점 화면은
--    남겨 두되 종이 점수가 우선한다 — 두 경로가 섞여도 한 팀에 한 값이다.
--      본선  judge_100 = coalesce(종이, 웹 pct × 90) + 발표(0~5) + (5 − 불참, 최소 0)
--      중간  score     = coalesce(종이, 웹 pct × 90) + 발표(0~10)
--  · mid_rankings 에 judge_paper_score 컬럼을 노출해 운영진 입력칸 초기값으로 쓴다.
-- =============================================================

alter table teams
  add column if not exists judge_paper_score numeric(4,1)
    check (judge_paper_score between 0 and 90),
  add column if not exists mid_judge_paper_score numeric(4,1)
    check (mid_judge_paper_score between 0 and 90);

-- ---------- 본선 집계 (0056 + 종이 심사 점수) ----------
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
         -- 종이 채점 평균(운영진 입력)이 있으면 우선, 없으면 웹 채점 환산(0057)
         coalesce(
           t.judge_paper_score,
           coalesce(sum(js.score::numeric) / nullif(sum(jc.max_score::numeric), 0), 0) * jm.total
         )
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
  where t.status <> 'withdrawn'   -- 기권 팀은 순위·진출 계산에서 빠진다(0056)
  group by p.id, t.absent_count, t.presentation_score, t.judge_paper_score, jm.total
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

-- ---------- 중간발표 집계 (0056 + 종이 심사 점수) ----------
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
    coalesce(
      t.mid_judge_paper_score,
      coalesce(sum(ms.score::numeric) / nullif(sum(c.max_score::numeric), 0), 0) * mm.total
    )
    + t.mid_presentation_score
  , 1)                                   as judge_score,
  t.mid_presentation_score               as presentation_score,
  t.mid_judge_paper_score                as judge_paper_score,
  count(distinct ms.judge_id)::int       as judge_count
from teams t
cross join mmax mm
left join mid_scores ms on ms.team_id = t.id
left join criteria c on c.id = ms.criteria_id and c.round = 'mid'
where t.status <> 'withdrawn'   -- 기권 팀 제외(0056)
group by t.id, t.name, t.mid_presentation_score, t.mid_judge_paper_score, mm.total
order by judge_score desc, t.name asc;

revoke select on mid_rankings from anon, authenticated;
