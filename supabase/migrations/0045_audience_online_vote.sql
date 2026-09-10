-- =============================================================
--  0045 — 주민투표를 현장 QR 온라인 투표로 전환
--
--  기존: 전시장에서 종이 스티커를 붙이고 운영진이 세어
--        projects.audience_votes_manual 에 수기로 입력.
--  변경: 전시장에서 나눠주는 1회용 QR(투표권)로 주민이 직접 온라인 투표.
--
--  스티커의 성질을 그대로 옮긴다 — 투표권 한 장에 3표, 한 팀에 한 표씩
--  서로 다른 팀에. 종이 스티커가 그랬듯 "누가 찍었는지"는 남기지 않고
--  투표권 단위로만 기록한다(개인 식별 정보 없음).
--
--  중복 방지는 투표권 자체가 한다. 링크가 단톡방으로 새어도 발급된 코드가
--  없으면 투표할 수 없고, 한 코드는 한 번만 쓰인다.
--  수기 입력은 완전히 대체되므로 컬럼과 화면을 함께 걷어낸다.
-- =============================================================

-- ---------- 설정 ----------
alter table event_settings
  add column if not exists audience_voting_open boolean not null default false,
  -- 투표권 한 장의 표 수. 스티커 3개가 기본이지만 운영진이 바꿀 수 있게 둔다.
  add column if not exists votes_per_ballot int not null default 3;

-- ---------- 투표권 (QR 한 장) ----------
create table if not exists audience_ballots (
  code       text primary key,                       -- QR 에 담기는 짧은 코드
  batch      text,                                   -- 발급 묶음 라벨 ("10/11 1층")
  created_at timestamptz not null default now(),
  used_at    timestamptz                             -- 투표 완료 시각
);
create index if not exists audience_ballots_batch_idx on audience_ballots (batch, created_at);

-- ---------- 표 ----------
-- (code, project_id) 를 PK 로 두면 한 투표권이 같은 팀에 두 표 주는 것을
-- 애플리케이션이 아니라 DB 가 막는다.
create table if not exists audience_votes (
  ballot_code text not null references audience_ballots(code) on delete cascade,
  project_id  uuid not null references projects(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (ballot_code, project_id)
);
create index if not exists audience_votes_project_idx on audience_votes (project_id);

-- ---------- 투표 규칙을 DB 에서 강제 ----------
-- 서버 액션에도 같은 검사가 있지만, 집계는 되돌릴 수 없는 데이터라
-- 마지막 방어선을 DB 에 둔다.
create or replace function enforce_audience_vote() returns trigger as $$
declare
  s      event_settings;
  ballot audience_ballots;
  used   int;
begin
  select * into s from event_settings where id = 1;
  if not coalesce(s.audience_voting_open, false) then
    raise exception '지금은 주민투표 기간이 아닙니다';
  end if;

  select * into ballot from audience_ballots where code = new.ballot_code for update;
  if ballot.code is null then
    raise exception '유효하지 않은 투표권입니다';
  end if;
  if ballot.used_at is not null then
    raise exception '이미 사용한 투표권입니다';
  end if;

  select count(*) into used from audience_votes where ballot_code = new.ballot_code;
  if used >= coalesce(s.votes_per_ballot, 3) then
    raise exception '투표권 한 장에 %표까지만 행사할 수 있습니다', s.votes_per_ballot;
  end if;

  return new;
end; $$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_audience_vote on audience_votes;
create trigger trg_audience_vote before insert on audience_votes
  for each row execute function enforce_audience_vote();

-- ---------- 권한 ----------
-- 발급·투표·집계 모두 서버 액션(Service Role)만 지나간다. anon 키로는
-- 표를 넣을 수도, 실시간 득표를 읽을 수도 없어야 한다 — 0035 와 같은 이유로
-- 중간 집계가 새면 남은 전시 기간의 투표가 흔들린다.
alter table audience_ballots enable row level security;
alter table audience_votes   enable row level security;
revoke all on audience_ballots from anon, authenticated;
revoke all on audience_votes   from anon, authenticated;

-- ---------- 수기 입력 걷어내기 ----------
-- rankings 가 컬럼을 참조하므로 뷰를 먼저 지우고 아래에서 다시 만든다.
drop view if exists rankings;
alter table projects drop column if exists audience_votes_manual;

-- ---------- 순위 뷰 (0040 구조 유지, 주민표 출처만 교체) ----------
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
-- 주민표: 수기 입력 대신 실제 온라인 표를 센다.
audience_norm as (
  select p.id as project_id, count(av.ballot_code)::int as audience_100
  from projects p
  left join audience_votes av on av.project_id = p.id
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
  an.audience_100             as audience_votes,
  r.stage1_score              as final_score,   -- 화면 호환: 1차 점수를 그대로 노출
  r.stage1_rank,
  (r.stage1_rank <= c.finalist_count) as is_finalist
from projects p
join teams t on t.id = p.team_id
join ranked r on r.project_id = p.id
join audience_norm an on an.project_id = p.id
cross join cfg c
-- 표시 순서 = 시상 순서.
--  ① 선정 4팀이 위로
--  ② 그 안에서는 주민투표 많은 순 (1위가 노원구청장 표창)
--  ③ 나머지는 1차 점수 순
-- 동점이어도 순서가 흔들리지 않도록 마지막에 팀명까지 넣는다.
order by
  (r.stage1_rank <= c.finalist_count) desc,
  case when r.stage1_rank <= c.finalist_count
       then an.audience_100 else null end desc nulls last,
  r.stage1_rank,
  t.name asc;

-- rankings 는 서비스 롤 전용이다(0022).
revoke select on rankings from anon, authenticated;
