-- =============================================================
--  0042 — 참가 신청 공고(2026.09.09 배포) 반영
--
--  0038 이 반영한 기획(안)과 실제로 배포된 모집 공고가 어긋난다.
--  공고가 참가자에게 나간 문서이므로 공고를 기준으로 맞춘다.
--
--    · 주제  4개 → 5개 (생활안전 빠지고 청년·지역 상생 / 배리어프리 추가)
--    · 모집  9.7~9.14 → 9.9~9.14
--    · 개회식·중간보고 18:30 → 18:00
--    · 전시  10.10~10.12 → 10.11~10.13
--    · 장소  80주년기념관 → 광운대학교 기념관
-- =============================================================

-- ---------- 1. 주제(track) ----------
-- safety(생활안전)는 공고에서 사라졌고, 가장 가까운 분류인
-- barrierfree(배리어프리 및 생활 편의)로 보낸다.
--
-- 0038 과 달리 제약을 먼저 떼고 값을 옮긴다 — 옮겨갈 값(barrierfree)이
-- 옛 제약에 없는 새 값이라, 순서가 반대면 update 가 제약 위반으로 막힌다.
-- (0038 은 이미 허용돼 있던 etc 로 보냈기에 순서가 문제되지 않았다.)
alter table projects drop constraint if exists projects_track_chk;

update projects set track = 'barrierfree' where track = 'safety';

alter table projects add constraint projects_track_chk
  check (track is null or track in
    ('commerce', 'esg', 'youth', 'barrierfree', 'etc'));

-- ---------- 2. 홈 타임라인 ----------
-- 0038 과 같은 이유로 전부 지우고 다시 넣는다.
delete from milestones;

insert into milestones (label, target_at, ends_at, place, sort) values
  ('참가팀 모집',       timestamptz '2026-09-09 00:00:00+09', timestamptz '2026-09-14 23:59:00+09', null,               10),
  ('개회식',            timestamptz '2026-09-16 18:00:00+09', null,                                 '광운대학교 기념관', 20),
  ('중간보고 · 멘토링',  timestamptz '2026-09-28 18:00:00+09', null,                                 '광운대학교 기념관', 30),
  ('본선 (무박 2일)',   timestamptz '2026-10-08 09:00:00+09', timestamptz '2026-10-09 13:10:00+09', '광운대학교 기념관', 40),
  ('전시회',            timestamptz '2026-10-11 00:00:00+09', timestamptz '2026-10-13 23:59:00+09', null,               50);
