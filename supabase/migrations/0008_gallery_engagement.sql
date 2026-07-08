-- =============================================================
--  0008 — 갤러리 참여 요소: 조회수 + 좋아요(응원)
-- =============================================================

-- ---------- 조회수 ----------
alter table projects add column if not exists view_count int not null default 0;

-- 원자적 증가 (익명 포함 누구나 호출). security definer 로 RLS 우회.
create or replace function increment_project_view(pid uuid)
returns int as $$
  update projects set view_count = view_count + 1
  where id = pid
  returning view_count;
$$ language sql security definer;

-- ---------- 좋아요(응원) ----------
-- liker_key: 로그인 사용자는 "user:<uid>", 익명은 "anon:<브라우저토큰>"
create table if not exists project_likes (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  liker_key  text not null,
  created_at timestamptz not null default now(),
  unique (project_id, liker_key)
);
create index if not exists project_likes_project_idx on project_likes (project_id);

alter table project_likes enable row level security;
-- 카운트/조회는 누구나. 등록/취소는 서버 액션(Service Role)이 처리.
drop policy if exists likes_read on project_likes;
create policy likes_read on project_likes for select using (true);
