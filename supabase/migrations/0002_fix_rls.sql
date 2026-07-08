-- =============================================================
--  0002 — RLS 보정
--  RLS 미적용 테이블은 anon/authenticated API 접근이 막히므로
--  앱이 일반 클라이언트로 읽는 테이블에 정책을 추가한다.
-- =============================================================

-- 대회 설정: 모두 조회 (랜딩/투표/결과 화면에서 사용). 수정은 secret 키 전용
alter table event_settings enable row level security;
drop policy if exists event_settings_read on event_settings;
create policy event_settings_read on event_settings for select using (true);

-- 관객 QR 토큰: 운영진만 조회 (발급/차감은 secret 키가 처리)
alter table audience_tokens enable row level security;
drop policy if exists audience_tokens_admin_read on audience_tokens;
create policy audience_tokens_admin_read on audience_tokens for select using (is_admin());

-- 투표: 본인 팀 투표 내역은 본인이 조회 (중복 투표 UI 표시용)
drop policy if exists votes_self_read on votes;
create policy votes_self_read on votes for select using (voter_id = auth.uid() or is_admin());

-- 집계 뷰 접근 권한 (결과 화면)
grant select on rankings to anon, authenticated;
