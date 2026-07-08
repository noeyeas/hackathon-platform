-- =============================================================
--  0005 — 마일스톤(여러 D-day) + 일정 항목 실제 날짜시간
-- =============================================================

-- 여러 개의 D-day 마일스톤 (예: 신청 마감, 본선 발표)
create table if not exists milestones (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,
  target_at  timestamptz not null,
  sort       int not null default 0,
  created_at timestamptz not null default now()
);

alter table milestones enable row level security;
drop policy if exists milestones_read on milestones;
create policy milestones_read on milestones for select using (true);
drop policy if exists milestones_admin_write on milestones;
create policy milestones_admin_write on milestones for all
  using (is_admin()) with check (is_admin());

-- 일정 항목: 실제 날짜+시간 컬럼 (기존 time_label 은 유지, 표시 시 fallback)
alter table schedule_items add column if not exists starts_at timestamptz;
