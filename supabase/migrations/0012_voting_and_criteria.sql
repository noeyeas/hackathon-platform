-- =============================================================
--  0012 — 투표 ON/OFF · 관객(주민) 수기 입력 · 심사 기준 개편
-- =============================================================

-- 투표 열림/닫힘 (단계 전환 대신 단순 토글)
alter table event_settings add column if not exists voting_open boolean not null default false;

-- 관객(주민) 투표: 운영진이 수기로 입력하는 팀별 득표수
alter table projects add column if not exists audience_votes_manual int not null default 0;

-- 심사 기준 설명
alter table criteria add column if not exists description text;

-- ---------- 심사 기준 재설정 (5개 + 배점) ----------
delete from criteria;   -- judge_scores 는 FK on delete cascade 로 함께 초기화됨
insert into criteria (name, max_score, weight, sort, description) values
  ('실현 가능성 & 완성도', 10, 35, 1, '제한 시간 내에 기획한 핵심 기능이 오류 없이 실제로 작동하는가? 법적·기술적 걸림돌 없이 현업에 바로 적용 가능한가?'),
  ('기술성 & 확장성',     10, 20, 2, '사용한 기술 스택이 탄탄하고 코드가 정교한가? 향후 유지보수나 확장이 용이한 구조인가?'),
  ('기획 및 문제 정의',    10, 15, 3, '타겟 유저의 페인 포인트(Pain Point)를 명확하게 짚어냈는가?'),
  ('시장성 및 비즈니스 효과', 10, 15, 4, '실제로 출시했을 때 유저들이 사용할 가치가 있는가?'),
  ('발표 및 UX/UI',       10, 15, 5, '제한 시간 내에 데모 시연을 매끄럽게 마쳤는가? 사용자가 쓰기 편한가?');

-- ---------- 투표 규칙 트리거: phase → voting_open ----------
create or replace function apply_vote_rules() returns trigger as $$
declare s event_settings;
begin
  select * into s from event_settings where id = 1;
  if not s.voting_open then
    raise exception '지금은 투표할 수 없습니다 (투표 마감)';
  end if;
  return new;
end; $$ language plpgsql;

-- ---------- 집계 뷰: 관객 투표를 수기 입력값으로 ----------
create or replace view rankings as
with judge_norm as (
  select p.id as project_id,
         coalesce(
           sum(js.score::numeric * c.weight) /
           nullif(sum(c.max_score::numeric * c.weight), 0) * 100, 0
         ) as judge_100
  from projects p
  left join judge_scores js on js.project_id = p.id
  left join criteria c on c.id = js.criteria_id
  group by p.id
),
team_votes as (
  select project_id, count(*) as n from votes where voter_type = 'team' group by project_id
),
maxes as (
  select
    greatest(1, (select max(n) from team_votes)) as max_team,
    greatest(1, (select max(audience_votes_manual) from projects)) as max_aud
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
  round(jn.judge_100, 1)                       as judge_score,
  coalesce(tv.n, 0)                            as team_votes,
  p.audience_votes_manual                      as audience_votes,
  round(
    jn.judge_100 * w.w_judge
    + (coalesce(tv.n,0)::numeric / m.max_team * 100) * w.w_team
    + (p.audience_votes_manual::numeric / m.max_aud * 100) * w.w_aud
  , 2)                                         as final_score
from projects p
join teams t on t.id = p.team_id
join judge_norm jn on jn.project_id = p.id
cross join maxes m
cross join w
left join team_votes tv on tv.project_id = p.id
order by final_score desc;

grant select on rankings to anon, authenticated;
