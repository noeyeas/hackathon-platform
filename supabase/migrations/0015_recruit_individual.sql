-- =============================================================
--  0015 — 모집 게시판: 팀/개인 구분 (개인 = 팀 구하는 사람)
-- =============================================================

alter table recruit_posts add column if not exists kind text not null default 'team'; -- 'team' | 'individual'
alter table recruit_posts alter column team_id drop not null;                         -- 개인 글은 팀 없음
alter table recruit_posts add column if not exists author_id uuid references users(id) on delete cascade;
alter table recruit_posts add column if not exists author_name text;                  -- 개인 글 표시용
alter table recruit_posts add column if not exists contact text;                      -- 개인 연락 방법

-- 쓰기 정책: 팀원(팀 글) 또는 작성자 본인(개인 글)
drop policy if exists recruit_write on recruit_posts;
create policy recruit_write on recruit_posts for all
  using (
    (team_id is not null and exists (
      select 1 from team_members m
      where m.team_id = recruit_posts.team_id and m.user_id = auth.uid()
    ))
    or author_id = auth.uid()
  )
  with check (
    (team_id is not null and exists (
      select 1 from team_members m
      where m.team_id = recruit_posts.team_id and m.user_id = auth.uid()
    ))
    or author_id = auth.uid()
  );
