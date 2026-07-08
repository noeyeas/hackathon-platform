-- =============================================================
--  0014 — 일정 기간(종료일) 지원: 달력에 이어진 띠로 표시
-- =============================================================

alter table schedule_items add column if not exists ends_at timestamptz;

-- 참가팀 모집: 8/24 ~ 9/2 기간으로 설정 (정오 KST)
update schedule_items
set ends_at = timestamptz '2026-09-02 12:00:00+09'
where title = '참가팀 모집' and ends_at is null;
