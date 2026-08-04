-- =============================================================
--  0030 — 마일스톤(홈 타임라인) 기간 지원 + 확정 일정 반영
-- =============================================================
-- 홈 히어로 타임라인은 milestones 를 그대로 표시하는데 단일 시점만 있어
-- "최종 발표 및 스프린트(무박 2일)" 를 9.18~19 로 보여줄 수 없었다.
-- schedule_items 는 이미 0014/0016 에서 같은 방식으로 ends_at 을 쓰고 있다.
alter table milestones add column if not exists ends_at timestamptz;

-- 확정 일정으로 정렬 (schedule_items 와 동일한 날짜·정오 KST 기준).
-- 기존 값이 9.9 / 9.13 으로 어긋나 있어 홈 타임라인만 다른 날짜를 보여줬다.
update milestones
set target_at = timestamptz '2026-09-07 12:00:00+09'
where label = '해커톤 개회식';

update milestones
set target_at = timestamptz '2026-09-11 12:00:00+09'
where label = '중간보고서 제출 및 멘토링';

update milestones
set target_at = timestamptz '2026-09-18 12:00:00+09',
    ends_at   = timestamptz '2026-09-19 12:00:00+09'
where label = '최종 발표 및 스프린트';
