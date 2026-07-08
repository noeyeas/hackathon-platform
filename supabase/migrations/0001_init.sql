-- =============================================================
--  해커톤 운영 플랫폼 — 초기 스키마 (핵심 플로우)
--  신청 → 팀 → 제출 → 투표(팀 상호 + 관객 QR) → 집계
--  대상: PostgreSQL / Supabase
-- =============================================================

create extension if not exists "pgcrypto";

-- ---------- ENUM ----------
create type user_role   as enum ('participant', 'judge', 'admin');
create type event_phase as enum ('signup', 'team_building', 'building', 'submitted', 'voting', 'closed');

-- ---------- 대회 설정 (단일 행) ----------
create table event_settings (
  id               int primary key default 1,
  name             text not null default '해커톤',
  phase            event_phase not null default 'signup',
  -- 최종 점수 가중치 (합 1.0). 예: {"judge":0.5,"team":0.25,"audience":0.25}
  weights          jsonb not null default '{"judge":0.5,"team":0.25,"audience":0.25}',
  submit_deadline  timestamptz,
  vote_opens_at    timestamptz,
  vote_closes_at   timestamptz,
  audience_votes   int not null default 3,   -- 관객 토큰당 표 수
  constraint one_row check (id = 1)
);
insert into event_settings (id) values (1) on conflict do nothing;

-- ---------- 사용자 (auth.users 와 1:1) ----------
create table users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text unique not null,
  name        text,
  avatar_url  text,
  role        user_role not null default 'participant',
  tech_stack  text[] default '{}',
  created_at  timestamptz not null default now()
);

-- ---------- 팀 ----------
create table teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  tagline     text,
  invite_code text unique not null default encode(gen_random_bytes(4), 'hex'),
  created_by  uuid references users(id) on delete set null,
  status      text not null default 'forming',  -- forming | locked
  created_at  timestamptz not null default now()
);

-- ---------- 팀원 (M:N, 1인 1팀) ----------
create table team_members (
  id        uuid primary key default gen_random_uuid(),
  team_id   uuid not null references teams(id) on delete cascade,
  user_id   uuid not null references users(id) on delete cascade,
  is_leader boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (user_id)   -- 한 사람은 하나의 팀에만
);
create index on team_members (team_id);

-- 팀 인원 2~4명 검증: 팀을 locked 로 바꿀 때 확인
create or replace function check_team_size() returns trigger as $$
declare cnt int;
begin
  if new.status = 'locked' then
    select count(*) into cnt from team_members where team_id = new.id;
    if cnt < 2 or cnt > 4 then
      raise exception '팀 인원은 2~4명이어야 합니다 (현재 %명)', cnt;
    end if;
  end if;
  return new;
end; $$ language plpgsql;

create trigger trg_team_size before update on teams
  for each row execute function check_team_size();

-- ---------- 제출작 (팀당 1개) ----------
create table projects (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null unique references teams(id) on delete cascade,
  title        text not null,
  description  text,
  repo_url     text,
  demo_url     text,
  video_url    text,
  deck_url     text,
  submitted_at timestamptz not null default now()
);

-- ---------- 평가 기준 ----------
create table criteria (
  id        uuid primary key default gen_random_uuid(),
  name      text not null,
  max_score int not null default 10,
  weight    numeric not null default 1,
  sort      int not null default 0
);
insert into criteria (name, max_score, weight, sort) values
  ('완성도',    10, 1, 1),
  ('창의성',    10, 1, 2),
  ('기술 난이도', 10, 1, 3),
  ('발표',      10, 1, 4);

-- ---------- 심사 점수 (전 심사위원이 전 팀 채점) ----------
create table judge_scores (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  judge_id    uuid not null references users(id) on delete cascade,
  criteria_id uuid not null references criteria(id) on delete cascade,
  score       int not null,
  comment     text,
  updated_at  timestamptz not null default now(),
  unique (project_id, judge_id, criteria_id)
);

-- ---------- 관객 QR 토큰 (테이블마다 다른 QR) ----------
create table audience_tokens (
  id          uuid primary key default gen_random_uuid(),
  token       text unique not null default encode(gen_random_bytes(9), 'base64'),
  label       text,                    -- 예: '테이블 1'
  votes_total int not null default 3,
  votes_used  int not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------- 투표 (팀 상호 + 관객) ----------
create table votes (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  voter_type text not null check (voter_type in ('team', 'audience')),
  -- team 투표: users.id / audience 투표: audience_tokens.id
  voter_id   uuid not null,
  created_at timestamptz not null default now(),
  unique (project_id, voter_id)   -- 같은 작품에 중복 투표 금지
);
create index on votes (project_id);

-- 팀 상호 투표: 자기 팀 작품에는 투표 불가
create or replace function block_self_vote() returns trigger as $$
begin
  if new.voter_type = 'team' then
    if exists (
      select 1 from projects p
      join team_members m on m.team_id = p.team_id
      where p.id = new.project_id and m.user_id = new.voter_id
    ) then
      raise exception '자기 팀에는 투표할 수 없습니다';
    end if;
  end if;
  return new;
end; $$ language plpgsql;

create trigger trg_self_vote before insert on votes
  for each row execute function block_self_vote();

-- 투표 시간창 검증 + 관객 토큰 표 수 차감
create or replace function apply_vote_rules() returns trigger as $$
declare s event_settings;
begin
  select * into s from event_settings where id = 1;
  if s.phase <> 'voting' then
    raise exception '지금은 투표 기간이 아닙니다';
  end if;
  if s.vote_opens_at is not null and now() < s.vote_opens_at then
    raise exception '투표가 아직 시작되지 않았습니다';
  end if;
  if s.vote_closes_at is not null and now() > s.vote_closes_at then
    raise exception '투표가 마감되었습니다';
  end if;

  if new.voter_type = 'audience' then
    update audience_tokens
      set votes_used = votes_used + 1
      where id = new.voter_id and votes_used < votes_total;
    if not found then
      raise exception '남은 표가 없거나 유효하지 않은 QR입니다';
    end if;
  end if;
  return new;
end; $$ language plpgsql;

create trigger trg_vote_rules before insert on votes
  for each row execute function apply_vote_rules();

-- =============================================================
--  집계 뷰 — 심사/팀/관객 점수를 0~100 으로 정규화해 가중 합산
-- =============================================================
create or replace view rankings as
with judge_norm as (          -- 심사: 기준별 가중 평균 → 100점
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
aud_votes as (
  select project_id, count(*) as n from votes where voter_type = 'audience' group by project_id
),
maxes as (
  select
    greatest(1, (select max(n) from team_votes)) as max_team,
    greatest(1, (select max(n) from aud_votes))  as max_aud
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
  round(jn.judge_100, 1)                                   as judge_score,
  coalesce(tv.n, 0)                                        as team_votes,
  coalesce(av.n, 0)                                        as audience_votes,
  round(
    jn.judge_100 * w.w_judge
    + (coalesce(tv.n,0)::numeric / m.max_team * 100) * w.w_team
    + (coalesce(av.n,0)::numeric / m.max_aud  * 100) * w.w_aud
  , 2)                                                     as final_score
from projects p
join teams t on t.id = p.team_id
join judge_norm jn on jn.project_id = p.id
cross join maxes m
cross join w
left join team_votes tv on tv.project_id = p.id
left join aud_votes  av on av.project_id = p.id
order by final_score desc;

-- =============================================================
--  RLS (Row Level Security)
--  참고: QR 토큰 발급/투표 집계 등 운영 작업은 Service Role 키로 서버에서 처리
-- =============================================================
alter table users        enable row level security;
alter table teams        enable row level security;
alter table team_members enable row level security;
alter table projects     enable row level security;
alter table judge_scores enable row level security;
alter table votes        enable row level security;
alter table criteria     enable row level security;

-- 관리자 판별 헬퍼
create or replace function is_admin() returns boolean as $$
  select exists (select 1 from users where id = auth.uid() and role = 'admin');
$$ language sql security definer stable;

-- users: 본인 조회/수정, 관리자 전체
create policy users_self_read   on users for select using (true);
create policy users_self_update on users for update using (id = auth.uid());
create policy users_self_insert on users for insert with check (id = auth.uid());

-- teams / team_members / projects: 로그인 사용자 조회, 본인 팀만 수정
create policy teams_read   on teams for select using (true);
create policy teams_write  on teams for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy members_read on team_members for select using (true);
create policy members_write on team_members for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy projects_read  on projects for select using (true);
create policy projects_write on projects for all using (
  exists (select 1 from team_members m where m.team_id = projects.team_id and m.user_id = auth.uid())
) with check (
  exists (select 1 from team_members m where m.team_id = projects.team_id and m.user_id = auth.uid())
);

-- criteria: 모두 조회
create policy criteria_read on criteria for select using (true);

-- judge_scores: 심사위원 본인 것만, 관리자 전체
create policy scores_read on judge_scores for select using (judge_id = auth.uid() or is_admin());
create policy scores_write on judge_scores for all
  using (judge_id = auth.uid() and (select role from users where id = auth.uid()) = 'judge')
  with check (judge_id = auth.uid());

-- votes: 팀 상호 투표는 본인(voter_id=auth.uid())만 insert. 관객 투표는 서버(Service Role)에서 처리
create policy votes_team_insert on votes for insert
  with check (voter_type = 'team' and voter_id = auth.uid());
create policy votes_read on votes for select using (is_admin());

-- =============================================================
--  auth.users 생성 시 users 행 자동 생성
-- =============================================================
create or replace function handle_new_user() returns trigger as $$
begin
  insert into public.users (id, email, name, avatar_url)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name'),
          new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end; $$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
