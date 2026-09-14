-- =============================================================
--  0050 — 최종 순위 = 심사점수 + 주민투표 점수 합산
--
--  기존(0040~0045): 전시 진출팀 안에서 주민투표 득표수만으로 시상 순서를
--  가렸다. 심사에서 1등을 해도 표가 적으면 4위 밖으로 밀렸다.
--  변경: 진출팀의 최종 점수 = 심사·팀 상호평가(1차 점수) 에 주민투표를
--  event_settings.weights 비율(기본 50 : 25 : 25)로 합산한다.
--
--  1차 선정(누가 전시에 나가는지)은 그대로 심사 + 팀 상호평가만 본다 —
--  전시 전에는 주민표가 아예 없기 때문이다.
--
--  주민표 환산: 진출팀 중 최다 득표 = 100점, 나머지는 비례. 득표수를
--  그대로 더하면 투표권 발급 수에 따라 주민 몫이 심사 몫을 삼켜버린다.
--
--  final_score 컬럼 의미가 바뀐다 — 진출팀은 합산 점수, 나머지는 1차
--  점수 그대로(전시에 못 나가 주민표가 0 이라 합산이 무의미하다).
-- =============================================================

create or replace view rankings as
with judge_norm as (
  select p.id as project_id,
         coalesce(sum(js.score::numeric) / nullif(sum(jc.max_score::numeric), 0) * 100, 0) as judge_100
  from projects p
  left join judge_scores js on js.project_id = p.id
  left join criteria jc on jc.id = js.criteria_id
  group by p.id
),
team_norm as (
  select p.id as project_id,
         coalesce(sum(ts.score::numeric) / nullif(sum(tc.max_score::numeric), 0) * 100, 0) as team_100
  from projects p
  left join team_scores ts on ts.project_id = p.id
  left join criteria tc on tc.id = ts.criteria_id
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
-- 1차 점수: 심사와 팀 상호평가만. 주민 몫을 뺀 만큼 다시 100점으로 되돌린다.
stage1 as (
  select
    p.id as project_id,
    jn.judge_100,
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
-- 진출팀 최다 득표(주민표 100점 기준). 아직 표가 없으면 0.
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
  round(s.team_100, 1)        as team_votes,
  s.votes                     as audience_votes,
  coalesce(s.final_score, s.stage1_score) as final_score,
  s.stage1_rank,
  s.is_finalist
from projects p
join teams t on t.id = p.team_id
join scored s on s.project_id = p.id
-- 표시 순서 = 시상 순서.
--  ① 진출팀이 위로
--  ② 그 안에서는 합산 점수 순 (1위가 노원구청장상), 동점이면 주민표 많은 순
--  ③ 나머지는 1차 점수 순
order by
  s.is_finalist desc,
  case when s.is_finalist then coalesce(s.final_score, s.stage1_score) end desc nulls last,
  case when s.is_finalist then s.votes end desc nulls last,
  s.stage1_rank,
  t.name asc;

-- rankings 는 서비스 롤 전용이다(0022).
revoke select on rankings from anon, authenticated;
