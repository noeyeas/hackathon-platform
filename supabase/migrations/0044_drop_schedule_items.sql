-- =============================================================
--  0044 — 쓰이지 않는 schedule_items 테이블을 지움
--
--  0004 에서 만든 뒤 홈 타임라인이 milestones(0005) 로 옮겨가면서
--  화면에서 읽는 곳이 사라졌다. 운영진 콘솔의 쓰기 경로도 78dc71a 에서
--  지웠으므로, 남아 있어도 아무도 읽지 않고 아무도 쓰지 않는다.
--
--  되돌리려면 0004·0005·0011·0014 를 다시 실행해 스키마를 세우고
--  데이터는 백업에서 복구해야 한다. 지우기 전에 아래로 내용을 확인할 것:
--
--    select count(*), min(starts_at), max(starts_at) from schedule_items;
--
--  일정은 milestones 로 관리한다(운영진 콘솔 /admin/schedule).
-- =============================================================

-- 정책은 테이블과 함께 사라지지만, 이름을 남겨 두면 나중에 같은 이름의
-- 정책을 다른 테이블에 만들 때 헷갈린다. 명시적으로 먼저 뗀다.
drop policy if exists schedule_read on schedule_items;
drop policy if exists schedule_admin_write on schedule_items;

-- cascade 는 쓰지 않는다. 이 테이블을 참조하는 무언가가 남아 있다면
-- 조용히 함께 지우는 대신 에러로 알려야 한다.
drop table if exists schedule_items;
