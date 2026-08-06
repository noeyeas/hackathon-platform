-- =============================================================
--  0035 — 실시간 집계 노출 차단 + SECURITY DEFINER search_path 고정
-- =============================================================

-- ---------- (1) 주민 득표수 공개 차단 ----------
-- 0022 는 실시간 순위 유출을 막으려고 rankings 뷰를 잠갔지만,
-- projects.audience_votes_manual 은 그대로 공개였다. projects_read 가
-- using(true) 이고 컬럼 권한 제한이 없어 anon 키로 이렇게 읽혔다:
--   GET /rest/v1/projects?select=title,audience_votes_manual
-- 최종 점수의 25% 가 실시간으로 새어 0022 의 의도가 절반 무너진다.
--
-- 0025 와 같은 방식: 테이블 단위 SELECT 를 회수하고 표시용 컬럼만 재부여.
-- 운영진 집계 화면은 Service Role 이라 영향받지 않는다.
revoke select on projects from anon, authenticated;
grant  select (
  id, team_id, title, description, track,
  repo_url, demo_url, video_url, deck_url,
  submitted_at, present_order, view_count
) on projects to anon, authenticated;
-- 제외: audience_votes_manual (운영진/Service Role 전용)

-- ---------- (2) SECURITY DEFINER 함수의 search_path 고정 ----------
-- search_path 가 열려 있으면 호출자가 스키마를 앞에 끼워 넣어 함수 안의
-- 테이블 참조를 가로챌 수 있다(권한 상승의 고전적 경로, Supabase 린터도
-- 지적하는 항목). is_admin() 은 모든 운영 권한 판정의 뿌리라 특히 중요하다.
-- 0033·0034 의 새 함수에는 이미 넣었고, 0001 의 두 함수가 빠져 있었다.
create or replace function is_admin() returns boolean as $$
  select exists (select 1 from users where id = auth.uid() and role = 'admin');
$$ language sql security definer stable set search_path = public;

create or replace function handle_new_user() returns trigger as $$
begin
  insert into public.users (id, email, name, avatar_url)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name'),
          new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end; $$ language plpgsql security definer set search_path = public;
