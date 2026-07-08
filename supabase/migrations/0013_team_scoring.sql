-- =============================================================
--  0013 — 배점=만점 통일 + 팀별 채점(심사 방식)
-- =============================================================

-- 각 기준의 만점을 배점(%)과 동일하게 (예: 35% → 35점 만점)
update criteria set max_score = weight::int;

-- ---------- 팀별 채점 (팀이 다른 팀을 심사처럼 채점) ----------
create table if not exists team_scores (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references projects(id) on delete cascade,  -- 평가 대상 작품
  voter_team_id uuid not null references teams(id) on delete cascade,     -- 채점하는 팀
  criteria_id   uuid not null references criteria(id) on delete cascade,
  score         int not null,
  updated_at    timestamptz not null default now(),
  unique (project_id, voter_team_id, criteria_id)
);

alter table team_scores enable row level security;
-- 조회는 관리자만 (집계는 rankings 뷰가 담당). 기록은 서버(Service Role)에서 검증 후 처리
drop policy if exists team_scores_admin_read on team_scores;
create policy team_scores_admin_read on team_scores for select using (is_admin());

-- ---------- 집계 뷰: 팀 점수 = 팀들의 채점 평균(0~100) ----------
drop view if exists rankings;
create view rankings as
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
  round(tn.team_100, 1)                   as team_votes,        -- 팀 점수(0~100)
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
order by final_score desc;

grant select on rankings to anon, authenticated;
