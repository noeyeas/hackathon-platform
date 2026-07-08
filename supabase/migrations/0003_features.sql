-- =============================================================
--  0003 — 기능 추가: 공지사항 · 발표 진행 · 팀원 모집
--  (announcements / recruit_posts 테이블을 이 마이그레이션에서 생성)
-- =============================================================

-- ---------- 공지사항 ----------
create table if not exists announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text,
  pinned     boolean not null default false,
  created_at timestamptz not null default now()
);

alter table announcements enable row level security;
drop policy if exists announcements_read on announcements;
create policy announcements_read on announcements for select using (true);
-- 작성/삭제는 secret 키(운영진 서버 액션)가 처리하지만, 정책도 함께 둠
drop policy if exists announcements_admin_write on announcements;
create policy announcements_admin_write on announcements for all
  using (is_admin()) with check (is_admin());

-- ---------- 발표 진행 ----------
-- 발표 순서 + 현재 발표 중인 팀 (projects, event_settings 는 0001에 존재)
alter table projects add column if not exists present_order int;
alter table event_settings add column if not exists presenting_project_id uuid references projects(id) on delete set null;

-- ---------- 팀원 모집 게시판 ----------
create table if not exists recruit_posts (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references teams(id) on delete cascade,
  title      text not null,
  body       text,
  positions  text[] default '{}',
  is_open    boolean not null default true,
  created_at timestamptz not null default now()
);

alter table recruit_posts enable row level security;

drop policy if exists recruit_read on recruit_posts;
create policy recruit_read on recruit_posts for select using (true);

drop policy if exists recruit_write on recruit_posts;
create policy recruit_write on recruit_posts for all
  using (
    exists (select 1 from team_members m
            where m.team_id = recruit_posts.team_id and m.user_id = auth.uid())
  )
  with check (
    exists (select 1 from team_members m
            where m.team_id = recruit_posts.team_id and m.user_id = auth.uid())
  );
