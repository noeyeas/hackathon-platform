-- =============================================================
--  0032 — 제출작 주제(트랙)
-- =============================================================
-- 갤러리에서 "어떤 주제의 팀인지"로 걸러 볼 수 있도록, 홈에 안내한 4개 주제를
-- 제출물에 붙인다. 이미 제출한 팀이 있을 수 있으므로 null 을 허용하고(미지정),
-- 갤러리에서는 미지정 항목도 그대로 보여준다.
--   esg 탄소 중립·ESG · commerce 시장 상권 · education 교육 · mobility 교통
alter table projects add column if not exists track text;

alter table projects drop constraint if exists projects_track_chk;
alter table projects add constraint projects_track_chk
  check (track is null or track in ('esg', 'commerce', 'education', 'mobility'));

create index if not exists projects_track_idx on projects (track);
