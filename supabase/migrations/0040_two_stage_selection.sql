-- =============================================================
--  0040 — 2단계 선정 구조
--
--  기존: 심사 50 + 팀 상호 25 + 주민 25 를 한 번에 합산해 종합 순위 1개.
--  변경: 두 단계로 나눈다.
--    1차 (10.9 최종발표) 심사위원 + 팀 상호평가 → 상위 4팀 선정
--    2차 (10.10~12 전시)  그 4팀만 대상으로 주민투표 → 1팀 선정
--
--  주민투표는 이제 총점에 섞이지 않는다. 4팀 안에서 순서만 가른다.
--  주민투표 1위 = 노원구청장 표창, 나머지 3팀 = 광운대학교 총장상.
--
--  4팀은 분야를 가리지 않고 1차 점수 상위로만 뽑는다(운영진 결정).
-- =============================================================

-- 선정 팀 수. 기획이 바뀌어도 SQL 을 고치지 않도록 설정값으로 둔다.
alter table event_settings
  add column if not exists finalist_count int not null default 4;

-- ---------- 순위 뷰 ----------
-- 컬럼 이름은 기존 화면이 그대로 쓰도록 유지하고(final_score 등),
-- 2단계 구조에 필요한 stage1_rank / is_finalist 를 더한다.
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
cfg as (
  select
    (weights->>'judge')::numeric as w_judge,
    (weights->>'team')::numeric  as w_team,
    finalist_count
  from event_settings where id = 1
),
-- 1차 점수: 심사와 팀 상호평가만. 주민 몫(0.25)을 뺀 만큼 다시 100점으로
-- 되돌린다 — 나누지 않으면 만점이 75점이 되어 화면 숫자가 어색해진다.
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
)
select
  p.id                        as project_id,
  t.id                        as team_id,
  t.name                      as team_name,
  p.title,
  round(r.judge_100, 1)       as judge_score,
  round(r.team_100, 1)        as team_votes,
  p.audience_votes_manual     as audience_votes,
  r.stage1_score              as final_score,   -- 화면 호환: 1차 점수를 그대로 노출
  r.stage1_rank,
  (r.stage1_rank <= c.finalist_count) as is_finalist
from projects p
join teams t on t.id = p.team_id
join ranked r on r.project_id = p.id
cross join cfg c
-- 표시 순서 = 시상 순서.
--  ① 선정 4팀이 위로
--  ② 그 안에서는 주민투표 많은 순 (1위가 노원구청장 표창)
--  ③ 나머지는 1차 점수 순
-- 동점이어도 순서가 흔들리지 않도록 마지막에 팀명까지 넣는다.
order by
  (r.stage1_rank <= c.finalist_count) desc,
  case when r.stage1_rank <= c.finalist_count
       then p.audience_votes_manual else null end desc nulls last,
  r.stage1_rank,
  t.name asc;

-- rankings 는 서비스 롤 전용이다(0022). create or replace 가 권한을 유지하지만
-- 방어적으로 다시 확인한다.
revoke select on rankings from anon, authenticated;
