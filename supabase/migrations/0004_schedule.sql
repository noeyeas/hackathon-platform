-- =============================================================
--  0004 — 일정표 + D-day
-- =============================================================

-- 대회 날짜 (D-day 카운트다운 기준)
alter table event_settings add column if not exists event_date timestamptz;

-- 일정표 항목
create table if not exists schedule_items (
  id         uuid primary key default gen_random_uuid(),
  time_label text,                 -- 예: "10:00", "Day1 13:00"
  title      text not null,
  sort       int not null default 0,
  created_at timestamptz not null default now()
);

alter table schedule_items enable row level security;
drop policy if exists schedule_read on schedule_items;
create policy schedule_read on schedule_items for select using (true);
-- 작성/삭제는 secret 키(운영진 서버 액션)가 처리
drop policy if exists schedule_admin_write on schedule_items;
create policy schedule_admin_write on schedule_items for all
  using (is_admin()) with check (is_admin());
