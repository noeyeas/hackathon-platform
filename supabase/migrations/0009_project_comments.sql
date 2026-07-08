-- =============================================================
--  0009 — 갤러리 댓글 (로그인 사용자만 작성)
-- =============================================================

create table if not exists project_comments (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists project_comments_project_idx
  on project_comments (project_id, created_at);

alter table project_comments enable row level security;

-- 읽기는 누구나
drop policy if exists comments_read on project_comments;
create policy comments_read on project_comments for select using (true);

-- 작성은 로그인 본인 명의로만
drop policy if exists comments_insert on project_comments;
create policy comments_insert on project_comments for insert
  with check (user_id = auth.uid());

-- 삭제는 작성자 본인 또는 운영진
drop policy if exists comments_delete on project_comments;
create policy comments_delete on project_comments for delete
  using (user_id = auth.uid() or is_admin());
