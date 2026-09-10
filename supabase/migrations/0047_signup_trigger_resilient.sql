-- =============================================================
--  0047 — 가입 트리거가 프로필 한 줄 때문에 로그인을 막지 않게 한다
--
--  증상: 구글 로그인이 500 unexpected_failure 로 끝난다.
--        (Auth Logs 에는 "Database error saving new user")
--
--  원인: 0035 의 handle_new_user() 는 on conflict (id) do nothing 만 걸어
--        두었는데, public.users.email 에는 unique 제약이 따로 있다(0001).
--        같은 이메일이 다른 id 로 이미 들어 있으면 unique_violation 이 나고,
--        트리거는 auth.users insert 와 같은 트랜잭션이므로 가입 자체가
--        통째로 롤백된다. 그 사람은 영영 로그인할 수 없다.
--
--  판단: 대회 당일 참가자가 로그인조차 못 하는 것보다, 프로필 행이 잠깐
--        비어 있는 편이 낫다. 로그인은 통과시키고 경고만 남긴다.
--
--  주의: 이 경로를 타면 public.users 에 행이 없는 로그인 사용자가 생긴다.
--        그 상태로는 팀 생성·참가(users(id) 외래키)와 role 기반 권한이
--        동작하지 않는다. 아래 "고아 행 점검" 쿼리로 미리 치워 둘 것.
-- =============================================================

create or replace function handle_new_user() returns trigger as $$
begin
  insert into public.users (id, email, name, avatar_url)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name'),
          new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
exception when unique_violation then
  -- 이메일 중복 등으로 프로필 생성이 막혀도 로그인 자체는 살린다.
  -- Postgres 로그에 남으므로 Supabase → Logs → Postgres 에서 추적 가능.
  raise warning 'handle_new_user 실패 — 프로필 없이 진행 (%): %', new.email, sqlerrm;
  return new;
end; $$ language plpgsql security definer set search_path = public;


-- =============================================================
--  고아 행 점검 — 위 트리거를 타게 만드는 원인을 미리 없앤다.
--  (읽기만 한다. 결과가 있으면 그 행을 어떻게 할지 사람이 판단할 것)
-- =============================================================
--  select u.id, u.email, u.role, u.created_at
--    from public.users u
--    left join auth.users a on a.id = u.id
--   where a.id is null;
--
--  지우기로 했다면 — team_members·judge_scores 등이 cascade 로 함께
--  사라지므로, 위 목록에 실제 운영진·심사위원이 없는지 반드시 먼저 확인:
--  delete from public.users
--   where id in (select u.id from public.users u
--                left join auth.users a on a.id = u.id
--                where a.id is null);
