-- =============================================================
--  0022 — 결과 공개 시점 통제 + 고아(QR/실시간 투표) 정리
--
--  (1) rankings 뷰를 anon/authenticated 에서 직접 못 읽게 한다.
--      결과 페이지는 종료(closed) 후, 또는 운영진일 때만 Service Role 로
--      읽어 노출한다(src/app/results/page.tsx). 종료 전 실시간 순위 유출 차단.
--
--  (2) 관객 투표는 수기 집계(projects.audience_votes_manual)로 확정.
--      QR 토큰/실시간 votes 경로는 앱에서 한 번도 소비되지 않는 고아이며
--      아무나 insert 가능한 쓰기 표면이었다. 관련 객체를 제거한다.
-- =============================================================

-- (1) 순위 뷰 직접 접근 차단 (0002/0012/0013 의 grant 취소)
revoke select on rankings from anon, authenticated;

-- (2) 고아 테이블/트리거/함수 제거
--     현재 rankings 뷰(0013)는 votes 에 의존하지 않으므로 안전하게 드롭.
drop trigger if exists trg_vote_rules on votes;
drop trigger if exists trg_self_vote  on votes;
drop table   if exists votes           cascade;   -- 정책·인덱스 함께 제거
drop table   if exists audience_tokens cascade;   -- 정책 함께 제거
drop function if exists apply_vote_rules();
drop function if exists block_self_vote();
