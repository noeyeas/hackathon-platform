-- =============================================================
--  0052 — 참여도 감점(불참 인원) 을 운영진이 입력해 심사 점수에서 뺌
--
--  공지 본선 심사 기준의 '참여도 5점'은 개회식·최종발표 불참 시 인당
--  1점씩 감점하는 항목이다. 심사위원이 매기는 점수가 아니므로 criteria
--  에는 두지 않고(0051), 운영진이 팀별 불참 인원을 적으면 rankings 뷰가
--  심사 점수(100점 환산)에서 그만큼 뺀다. 1차 선정과 최종 점수 모두
--  judge_100 을 쓰므로 둘 다 자동으로 반영된다.
--
--  teams 의 select 는 컬럼 단위로만 열려 있어(0025) 새 컬럼은 서비스 롤
--  외에는 읽을 수 없다 — 심사위원·참가자 화면에 새어 나가지 않는다.
--  rankings 뷰도 서비스 롤 전용이다(0022).
-- =============================================================

alter table teams
  add column absent_count int not null default 0
  check (absent_count >= 0);

-- 뷰 컬럼이 추가되므로 create or replace 로는 안 되고 지웠다 다시 만든다.
drop view if exists rankings;

create or replace view rankings as
with -- 심사 점수(100점 환산)에서 참여도 감점을 뺀다. 감점은 불참 인원당 1점,
-- 참여도 배점이 5점이라 5점을 넘지 않는다. 0 아래로는 내려가지 않는다.
judge_norm as (
  select p.id as project_id,
         greatest(
           coalesce(sum(js.score::numeric) / nullif(sum(jc.max_score::numeric), 0) * 100, 0)
           - least(t.absent_count, 5),
           0
         ) as judge_100,
         t.absent_count
  from projects p
  join teams t on t.id = p.team_id
  left join judge_scores js on js.project_id = p.id
  left join criteria jc on jc.id = js.criteria_id
  group by p.id, t.absent_count
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
    jn.absent_count,
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
  s.absent_count,
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
