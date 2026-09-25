-- =============================================================
--  0059 — 심사는 종이 채점표만. 웹 채점(온라인 평가)을 걷어내고,
--         운영진이 심사위원별 종이 점수를 옮겨 적으면 평균·총점이 바로 나온다
--
--  운영 결정(9/26): 중간발표(9.28)·본선(10.9) 모두 심사위원은 종이 채점표로만
--  채점한다(안내 메일 3항 "별도 웹 로그인이나 기기 준비는 필요 없습니다").
--  0053·0057 은 웹 채점을 남겨 두고 종이 점수를 "덮어쓰기"로 얹었는데, 두 경로가
--  공존하니 (1) 운영진이 팀별 평균을 손으로 계산해 적어야 하고 (2) 어느 값이
--  집계에 쓰인 건지 화면에서 헷갈렸다. 이제 경로는 하나다.
--
--  · judge_sheets — 회수한 채점표 한 장 = 한 행. (라운드, 팀, 심사위원) 별
--    항목 합계(0~90)를 운영진이 입력한다. 팀 점수는 입력된 장수만큼 평균 →
--    평균 계산이 사람 손을 떠난다. 심사위원 2명만 온 날이면 2장 평균이다.
--  · 심사위원 명부는 judge_emails(0055)를 그대로 쓴다. 웹 로그인이 없어졌으니
--    users 행(=로그인한 사람)에 묶으면 안 된다 — 명부는 로그인과 무관해야 한다.
--  · 집계 (teams.judge_paper_score 덮어쓰기 → judge_sheets 평균)
--      본선  judge_100 = avg(종이 90점) + 발표(0~5) + (5 − 불참, 최소 0)
--      중간  score     = avg(종이 90점) + 발표(0~10)
--  · 걷어내는 것: judge_scores · mid_scores(웹 채점 저장소),
--    mid_scores_round_guard(), teams.judge_paper_score ·
--    teams.mid_judge_paper_score(수기 평균), event_settings.mid_judging_open
--    (웹 채점 스위치). criteria 는 남는다 — 팀 상호평가(/vote)가 같은 심사표를 쓴다.
-- =============================================================

-- ---------- 1. 웹 채점 제거 ----------
-- 뷰가 아래 테이블·컬럼을 붙잡고 있으므로 먼저 떨군다(끝에서 다시 만든다).
drop view if exists mid_rankings;
drop view if exists rankings;

drop table if exists judge_scores;   -- 본선 웹 채점(0001)
drop table if exists mid_scores;     -- 중간발표 웹 채점(0053)
drop function if exists mid_scores_round_guard();

alter table teams
  drop column if exists judge_paper_score,       -- 수기 평균(0057) → judge_sheets 평균
  drop column if exists mid_judge_paper_score;

alter table event_settings
  drop column if exists mid_judging_open;        -- 웹 채점 스위치(0053)

-- ---------- 2. 회수한 채점표 ----------
create table if not exists judge_sheets (
  round       text not null check (round in ('mid', 'final')),
  team_id     uuid not null references teams(id) on delete cascade,
  judge_email text not null references judge_emails(email) on delete cascade,
  -- 채점표 4항목 합계. 소수 1자리까지 받는다(항목 점수는 정수지만
  -- 운영진이 재검표 중 평균을 임시로 적는 경우가 있다).
  score       numeric(4,1) not null check (score between 0 and 90),
  updated_at  timestamptz not null default now(),
  primary key (round, team_id, judge_email)
);

-- 점수는 발표 전까지 참가자·심사위원에게 새면 안 된다. 정책을 하나도 두지
-- 않는다 = anon/authenticated 는 읽지도 쓰지도 못하고 서비스 롤만 쓴다
-- (judge_emails·rankings 와 같은 방식).
alter table judge_sheets enable row level security;

-- ---------- 3. 본선 집계 (0058 + 종이 평균) ----------
create view rankings as
with
sheets as (
  -- 팀별 종이 채점 평균. 입력된 장수(cnt)로만 나눈다 — 불참 심사위원의
  -- 빈칸이 0 점으로 잡히면 팀이 억울하게 깎인다.
  select team_id,
         round(avg(score), 1) as avg_score,
         count(*)::int        as sheet_count
  from judge_sheets
  where round = 'final'
  group by team_id
),
judge_norm as (
  select p.id as project_id,
         coalesce(sh.avg_score, 0)
           + t.presentation_score
           + greatest(5 - t.absent_count, 0)
           as judge_100,
         t.absent_count,
         t.presentation_score,
         sh.avg_score                  as judge_paper_avg,
         coalesce(sh.sheet_count, 0)   as sheet_count
  from projects p
  join teams t on t.id = p.team_id
  left join sheets sh on sh.team_id = t.id
  where t.status <> 'withdrawn'   -- 기권 팀은 순위·진출 계산에서 빠진다(0056)
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
    jn.judge_paper_avg,
    jn.sheet_count,
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
  t.team_no,
  p.title,
  round(s.judge_100, 1)       as judge_score,
  s.absent_count,
  s.presentation_score,
  s.judge_paper_avg,
  s.sheet_count,
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
  t.team_no asc nulls last,
  t.name asc;

revoke select on rankings from anon, authenticated;

-- ---------- 4. 중간발표 집계 (0058 + 종이 평균) ----------
create view mid_rankings as
with sheets as (
  select team_id,
         round(avg(score), 1) as avg_score,
         count(*)::int        as sheet_count
  from judge_sheets
  where round = 'mid'
  group by team_id
)
select
  t.id   as team_id,
  t.name as team_name,
  t.team_no,
  round(coalesce(sh.avg_score, 0) + t.mid_presentation_score, 1) as judge_score,
  t.mid_presentation_score           as presentation_score,
  sh.avg_score                       as judge_paper_avg,
  coalesce(sh.sheet_count, 0)        as sheet_count
from teams t
left join sheets sh on sh.team_id = t.id
where t.status <> 'withdrawn'   -- 기권 팀 제외(0056)
order by judge_score desc, t.team_no asc nulls last, t.name asc;

revoke select on mid_rankings from anon, authenticated;
