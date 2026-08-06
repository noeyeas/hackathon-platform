-- =============================================================
--  0034 — 조회수 중복 집계 차단 (서버 측)
--
--  기존 방어는 쿠키(vw_<id>) 하나뿐이라 쿠키를 지우거나 시크릿 창을 쓰면
--  같은 사람이 조회수를 무한히 올릴 수 있었다. 순위에 반영되진 않지만
--  갤러리에 그대로 노출되는 숫자라 조작 여지를 남길 이유가 없다.
--
--  방문자 식별은 해시로만 남긴다 — 로그인 사용자는 user id, 비로그인은
--  IP + User-Agent 를 서버 비밀값과 함께 해싱한다. 원본 IP 는 저장하지
--  않으므로 로그에서 개인을 역추적할 수 없다.
-- =============================================================

create table if not exists project_view_log (
  project_id  uuid not null references projects(id) on delete cascade,
  viewer_hash text not null,
  viewed_at   timestamptz not null default now(),
  primary key (project_id, viewer_hash)
);

-- 정리 작업(오래된 행 삭제)용
create index if not exists project_view_log_viewed_idx
  on project_view_log (viewed_at);

-- 서버 액션(Service Role)만 읽고 쓴다. 방문 기록이므로 공개 조회는 막는다.
alter table project_view_log enable row level security;
-- (정책을 만들지 않으면 anon/authenticated 는 전부 거부된다)

-- ---------- 중복이 아닐 때만 증가시키는 원자적 집계 ----------
-- 삽입 성공 = 이 방문자의 첫 조회 → 그때만 view_count 를 올린다.
-- 경쟁 조건(같은 방문자의 동시 요청)은 기본키 충돌로 DB 가 걸러낸다.
create or replace function count_project_view(pid uuid, vhash text)
returns int as $$
declare
  inserted int := 0;
  total    int;
begin
  insert into project_view_log (project_id, viewer_hash)
  values (pid, vhash)
  on conflict do nothing;

  get diagnostics inserted = row_count;

  if inserted > 0 then
    update projects set view_count = view_count + 1
    where id = pid
    returning view_count into total;
  else
    select view_count into total from projects where id = pid;
  end if;

  return coalesce(total, 0);
end;
$$ language plpgsql security definer set search_path = public;

-- 이전 RPC 와 마찬가지로 서버에서만 호출한다(0027 과 같은 형태).
revoke execute on function count_project_view(uuid, text) from public, anon, authenticated;
grant  execute on function count_project_view(uuid, text) to service_role;

-- 무조건 증가시키던 구 RPC 는 더 이상 쓰지 않는다.
drop function if exists increment_project_view(uuid);
