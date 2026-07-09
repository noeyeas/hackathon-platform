-- =============================================================
--  0023 — 순위 뷰 동점 타이브레이커 (결정적 정렬)
--  기존엔 final_score 만으로 정렬해 동점 시 순서(및 🥇/🥈)가 비결정적이었다.
--  종합 동점 → 심사 → 팀 → 주민 → 팀명 순으로 안정 정렬한다.
--  (0013 의 뷰 정의를 그대로 두고 ORDER BY 만 확장)
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
maxes as (
  select greatest(1, (select max(audience_votes_manual) from projects)) as max_aud
),
w as (
  select
    (weights->>'judge')::numeric    as w_judge,
    (weights->>'team')::numeric     as w_team,
    (weights->>'audience')::numeric as w_aud
  from event_settings where id = 1
)
select
  p.id as project_id,
  t.id as team_id,
  t.name as team_name,
  p.title,
  round(jn.judge_100, 1)                  as judge_score,
  round(tn.team_100, 1)                   as team_votes,
  p.audience_votes_manual                 as audience_votes,
  round(
    jn.judge_100 * w.w_judge
    + tn.team_100 * w.w_team
    + (p.audience_votes_manual::numeric / m.max_aud * 100) * w.w_aud
  , 2)                                    as final_score
from projects p
join teams t on t.id = p.team_id
join judge_norm jn on jn.project_id = p.id
join team_norm tn on tn.project_id = p.id
cross join maxes m
cross join w
order by final_score desc, judge_score desc, team_votes desc,
         audience_votes desc, team_name asc;

-- create or replace 는 0022 의 revoke 상태를 유지하지만 방어적으로 재확인
revoke select on rankings from anon, authenticated;
