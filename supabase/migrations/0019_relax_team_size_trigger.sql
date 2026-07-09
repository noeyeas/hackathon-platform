-- =============================================================
--  0019 — 팀 인원 검증 트리거 완화
-- =============================================================
-- 기존 트리거는 '잠긴(locked)' 팀을 수정할 때마다 2~4명 검사를 다시 해,
-- 팀장 1인 대표 계정 구조에서는 팀 정보 수정이 막혔다.
-- → 잠금으로 '전환'되는 순간에만 검사하도록 변경 (일반 수정은 통과).
create or replace function check_team_size() returns trigger as $$
declare cnt int;
begin
  if new.status = 'locked'
     and (old.status is distinct from 'locked') then
    select count(*) into cnt from team_members where team_id = new.id;
    if cnt < 2 or cnt > 4 then
      raise exception '팀 인원은 2~4명이어야 합니다 (현재 %명)', cnt;
    end if;
  end if;
  return new;
end; $$ language plpgsql;
