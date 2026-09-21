-- =============================================================
--  0055 — 심사위원 이메일을 미리 등록해 두면 첫 로그인 때 자동으로 judge 가 된다
--
--  지금까지는 심사위원이 먼저 가입한 뒤 운영진이 Table Editor 에서 role 을
--  손으로 바꿔야 했다(README 7-4). 중간발표(9.28) 당일 심사위원이 처음
--  로그인하는데 그 자리에서 운영진이 DB 를 만지는 건 무리라, 팀장 이메일
--  (leader_email, 0047)과 같은 방식으로 이메일을 미리 적어 둔다.
--
--  · judge_emails — 심사위원 이메일 목록(소문자). 서비스 롤 전용.
--  · handle_new_user() — 가입 시 이메일이 목록에 있으면 role = 'judge'.
--  · 이미 가입한 사람은 아래 update 로 한 번에 맞춘다(운영진은 건드리지 않음).
--
--  심사위원을 더 넣을 때:
--    insert into judge_emails (email, name) values ('x@y.z', '이름');
--    update users set role = 'judge' where lower(email) = 'x@y.z' and role = 'participant';
-- =============================================================

create table if not exists judge_emails (
  email      text primary key,
  name       text,
  created_at timestamptz not null default now()
);
alter table judge_emails enable row level security;
-- 정책을 하나도 두지 않는다 = anon/authenticated 는 읽지도 쓰지도 못한다.

insert into judge_emails (email, name) values
  ('kdpark.kw@gmail.com', '박규동 교수님'),
  ('leo@manyfast.io',     '허재혁 대표님 (매니패스트)')
on conflict (email) do nothing;

create or replace function handle_new_user() returns trigger as $$
begin
  insert into public.users (id, email, name, avatar_url, role)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name'),
          new.raw_user_meta_data->>'avatar_url',
          case when exists (select 1 from public.judge_emails j
                             where j.email = lower(new.email))
               then 'judge'::user_role else 'participant'::user_role end)
  on conflict (id) do nothing;
  return new;
exception when unique_violation then
  -- 0047: 프로필 생성이 막혀도 로그인 자체는 살린다.
  raise warning 'handle_new_user 실패 — 프로필 없이 진행 (%): %', new.email, sqlerrm;
  return new;
end; $$ language plpgsql security definer set search_path = public;

-- 이미 가입해 있던 심사위원
update users u
   set role = 'judge'
  from judge_emails j
 where lower(u.email) = j.email
   and u.role = 'participant';
