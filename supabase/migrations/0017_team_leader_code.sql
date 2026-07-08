-- =============================================================
--  0017 — 팀 코드 분리: 팀장 코드 / 팀원 코드
--  invite_code 는 팀원용, leader_code 는 팀장 전용(최초 1회 팀장 지정)
-- =============================================================

alter table teams
  add column if not exists leader_code text unique not null
    default encode(gen_random_bytes(4), 'hex');
