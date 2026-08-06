-- =============================================================
--  0031 — 공지 분류(카테고리)
-- =============================================================
-- 공지가 쌓이면 "언제 무엇을" 찾기 어려워, 목록에서 성격별로 걸러볼 수
-- 있도록 카테고리를 둔다. 기존 공지는 모두 '일반'으로 시작한다.
--   general  일반 · schedule 일정 · rule 규정 · submit 제출
alter table announcements
  add column if not exists category text not null default 'general';

alter table announcements drop constraint if exists announcements_category_chk;
alter table announcements add constraint announcements_category_chk
  check (category in ('general', 'schedule', 'rule', 'submit'));

-- 목록은 항상 고정 → 최신순으로 읽고 카테고리로 거른다.
create index if not exists announcements_category_created_idx
  on announcements (category, created_at desc);
