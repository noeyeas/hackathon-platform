-- =============================================================
--  0006 — 대회 일정 시드 (2026)
--  기간/날짜 단위 항목: time_label 로 사람이 읽기 좋은 라벨을 넣고,
--  starts_at 은 정렬용 실제 시작일(정오 KST)로 채운다.
--  title 로 중복 여부를 판단해 재실행해도 안전(idempotent).
-- =============================================================

insert into schedule_items (time_label, starts_at, title, sort)
select v.time_label, v.starts_at, v.title, v.sort
from (values
  ('8월 24일 ~ 9월 2일',        timestamptz '2026-08-24 12:00:00+09', '참가팀 모집',                    10),
  ('9월 7일',                   timestamptz '2026-09-07 12:00:00+09', '대회 시작',                      20),
  ('9월 11일',                  timestamptz '2026-09-11 12:00:00+09', '중간 보고서 제출 및 멘토링',      30),
  ('9월 18일 ~ 19일 (무박 2일)', timestamptz '2026-09-18 12:00:00+09', '최종 발표 및 스프린트 · 기념관 319호', 40)
) as v(time_label, starts_at, title, sort)
where not exists (
  select 1 from schedule_items s where s.title = v.title
);
