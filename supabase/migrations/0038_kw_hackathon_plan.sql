-- =============================================================
--  0038 — 기획(안) 반영 (제53대 총학생회 26-060호, 2026.09.02)
--
--  홈페이지 문구는 코드에 있지만, 주제(track) 제약과 홈 히어로 타임라인은
--  DB 에 있어 함께 맞춰야 한다. 코드만 바꾸면 제출 화면에서 고른 주제가
--  저장 시점에 체크 제약으로 막힌다.
--
--  심사 기준(criteria)은 여기서 건드리지 않는다 — criteria 를 지우면
--  judge_scores 가 FK cascade 로 함께 지워진다. 별도 판단이 필요하다.
-- =============================================================

-- ---------- 1. 주제(track): 교육·교통 → 생활안전·기타 ----------
-- 기획(안): 상권 활성화 / 생활안전 / 탄소중립 및 ESG / 기타(지역 연계형)
--
-- 기존 값을 먼저 옮기고 제약을 바꾼다. 순서가 반대면 제약 위반으로 실패한다.
-- education·mobility 는 새 분류에 대응하는 항목이 없어 '기타'로 보낸다.
update projects set track = 'etc'
 where track in ('education', 'mobility');

alter table projects drop constraint if exists projects_track_chk;
alter table projects add constraint projects_track_chk
  check (track is null or track in ('commerce', 'safety', 'esg', 'etc'));

-- ---------- 2. 홈 타임라인 ----------
-- 일정이 통째로 바뀌었으므로(9월 → 9~10월) 개별 항목을 골라 고치지 않고
-- 전부 지우고 다시 넣는다. 라벨로 골라 지우면 운영진이 콘솔에서 이름을
-- 바꾼 항목을 놓쳐 옛 일정과 새 일정이 섞인 채로 남는다.
--
-- 이 표는 홈 히어로 타임라인 전용이고 운영 콘솔에서 언제든 고칠 수 있다.
delete from milestones;

insert into milestones (label, target_at, ends_at, place, sort) values
  ('참가팀 모집',       timestamptz '2026-09-07 00:00:00+09', timestamptz '2026-09-14 23:59:00+09', null,                 10),
  ('개회식 및 OT',      timestamptz '2026-09-16 18:30:00+09', null,                                 '80주년기념관 310호', 20),
  ('중간발표 · 멘토링',  timestamptz '2026-09-28 18:30:00+09', null,                                 '80주년기념관 310호', 30),
  ('해커톤 본선',       timestamptz '2026-10-08 09:00:00+09', timestamptz '2026-10-09 13:10:00+09', '80주년기념관 2~3층', 40),
  ('전시 및 주민투표',   timestamptz '2026-10-10 00:00:00+09', timestamptz '2026-10-12 23:59:00+09', null,                 50);

-- ---------- 3. 제출 마감 ----------
-- 최종 발표 시작(10.9 09:00) 이후로는 제출물을 고칠 수 없어야 한다.
-- 심사 중에 제출물이 바뀌면 채점 근거가 흔들린다(submit/actions.ts 참고).
update event_settings
   set submit_deadline = timestamptz '2026-10-09 09:00:00+09'
 where id = 1;
