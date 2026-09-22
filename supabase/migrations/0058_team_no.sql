-- =============================================================
--  0058 — 조 번호 (team_no)
--
--  운영 결정(9/22): 40팀에 1~40조 번호를 붙여 발표 순서·좌석·채점표·화면
--  표기를 모두 "N조 팀이름" 으로 통일한다. 이름순 정렬 대신 조 번호순.
--
--  · teams.team_no — 1 이상 정수, 팀마다 유일. null 은 아직 번호가 없는 팀
--    (운영진이 팀 등록 화면에서 적는다).
--  · rankings / mid_rankings 뷰에 team_no 를 노출하고, 동점 시 정렬을
--    이름순 → 조 번호순으로 바꾼다.
--  · 기권한 3조(어쩌다 개발자)도 번호는 그대로 둔다 — 빈 번호로 남긴다.
-- =============================================================

alter table teams
  add column if not exists team_no integer
    check (team_no >= 1);
create unique index if not exists teams_team_no_key on teams (team_no);

update teams t
   set team_no = v.no
  from (values
  (1, '토큰좀주세요'),
  (2, '솜사탕과 너구리'),
  (3, '어쩌다 개발자'),
  (4, '얼마Geo'),
  (5, '라스트팡'),
  (6, 'CALAR'),
  (7, '로컬호스트'),
  (8, 'ESGenius'),
  (9, '월계동행'),
  (10, '컴미컴'),
  (11, '월월계계'),
  (12, '우럭아왜우럭'),
  (13, 'NowonLikeUs'),
  (14, '강컴퍼니'),
  (15, '복지나침반'),
  (16, '유구무언'),
  (17, '탄탄대로'),
  (18, '방과 후 지도타임'),
  (19, '월계상단'),
  (20, 'ABC'),
  (21, '배고프당'),
  (22, '4 guys'),
  (23, '경영과컴퓨터'),
  (24, '삼삼오오'),
  (25, '월계방범대'),
  (26, 'COMs'),
  (27, 'MassCOM'),
  (28, '월계원정대'),
  (29, '지단'),
  (30, '떡잎마을방범대'),
  (31, '바오밥나무'),
  (32, '월계디버깅'),
  (33, '입대 전 발악'),
  (34, '허강정'),
  (35, '월계 계섯거라'),
  (36, '노놀'),
  (37, '이음(IEUM)'),
  (38, '이오'),
  (39, '일동차렷'),
  (40, '월계획')
  ) as v(no, name)
 where t.name = v.name;

-- ---------- 본선 집계 (0057 + 조 번호) ----------
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
  t.team_no,
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
  t.team_no asc nulls last,
  t.name asc;

revoke select on rankings from anon, authenticated;

-- ---------- 중간발표 집계 (0057 + 조 번호) ----------
drop view if exists mid_rankings;

create view mid_rankings as
with mmax as (
  select coalesce(sum(max_score), 0)::numeric as total
  from criteria where round = 'mid'
)
select
  t.id   as team_id,
  t.name as team_name,
  t.team_no,
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
group by t.id, t.name, t.team_no, t.mid_presentation_score, t.mid_judge_paper_score, mm.total
order by judge_score desc, t.team_no asc nulls last, t.name asc;

revoke select on mid_rankings from anon, authenticated;
