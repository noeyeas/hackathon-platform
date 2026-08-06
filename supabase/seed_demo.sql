-- =============================================================
--  예시(데모) 데이터 — 팀 8개 + 제출작 8개
--
--  용도: 갤러리 / 제출작 / 발표 화면(stage) / 팀별 채점(vote) 등
--        화면을 실제 데이터가 있는 상태로 확인하기 위한 시드.
--
--  실행: Supabase → SQL Editor 에 이 파일 전체를 붙여넣고 실행.
--       (마이그레이션이 아니므로 migrations/ 에 두지 않는다)
--
--  안전장치
--   - 모든 행이 고정 UUID(d0000000-…/d1000000-…)를 쓰므로 여러 번 실행해도
--     중복 생성되지 않는다(on conflict do nothing).
--   - 실제 참가 데이터와 섞이지 않게 초대코드/팀장코드는 'demo' 접두어,
--     팀장 이메일은 @demo.local 도메인을 쓴다.
--   - 되돌리려면 맨 아래 "삭제(롤백)" 블록의 주석을 풀어 실행한다.
--     삭제는 고정 UUID 로만 지우므로 실제 데이터는 건드리지 않는다.
--
--  포함하지 않는 것: 사용자·팀원(auth.users 필요), 심사/팀 채점 점수,
--                   공지·일정, 모집글·댓글. 필요하면 따로 요청할 것.
-- =============================================================

begin;

-- ---------- 팀 ----------
-- created_by 는 null (데모 계정을 만들지 않기 위해). 팀장 연결은 leader_email
-- 로 이뤄지므로, 실제로 로그인해 확인하려면 그 자리에 본인 이메일을 넣으면 된다.
insert into teams (id, name, tagline, members_note, invite_code, leader_code, leader_email, status)
values
  ('d0000000-0000-4000-8000-000000000001', '코드모아',     '동네 문제를 코드로 풉니다',         '김하늘 · 이준서 · 박서연',            'demo0001', 'demolead0001', 'demo1@demo.local', 'locked'),
  ('d0000000-0000-4000-8000-000000000002', '데이터한스푼', '데이터 한 스푼으로 시장을 살리기',   '정우진 · 최민서 · 한지호 · 오유나',   'demo0002', 'demolead0002', 'demo2@demo.local', 'locked'),
  ('d0000000-0000-4000-8000-000000000003', '파란불',       '모두가 안전하게 건너는 횡단보도',     '윤도현 · 강예린',                     'demo0003', 'demolead0003', 'demo3@demo.local', 'locked'),
  ('d0000000-0000-4000-8000-000000000004', '새벽배송단',   '로컬푸드를 더 가깝게',               '임수빈 · 신재하 · 문가온',            'demo0004', 'demolead0004', 'demo4@demo.local', 'locked'),
  ('d0000000-0000-4000-8000-000000000005', '리트라이',     '다시 시작하는 사람들을 위한 공간',    '배시우 · 노아름 · 서지훈 · 이도경',   'demo0005', 'demolead0005', 'demo5@demo.local', 'locked'),
  ('d0000000-0000-4000-8000-000000000006', '오늘도맑음',   '우리 마을 날씨는 우리가 제일 잘 안다', '조은결 · 황서아 · 백준영',            'demo0006', 'demolead0006', 'demo6@demo.local', 'locked'),
  ('d0000000-0000-4000-8000-000000000007', '두런두런',     '민원도 대화가 될 수 있다면',          '권나윤 · 유하준 · 심채원',            'demo0007', 'demolead0007', 'demo7@demo.local', 'locked'),
  ('d0000000-0000-4000-8000-000000000008', '나침반',       '귀촌 첫 1년을 함께',                 '전시현 · 남기훈',                     'demo0008', 'demolead0008', 'demo8@demo.local', 'locked')
on conflict do nothing;

-- ---------- 제출작 ----------
-- present_order: 발표 순서(무대 화면 /stage 에서 사용)
-- view_count:    갤러리 조회수 (참여도 표시용 예시값)
-- audience_votes_manual: 주민 투표는 운영진이 수기 입력하는 값이라 0으로 둔다.
insert into projects (
  id, team_id, title, description,
  repo_url, demo_url, video_url, deck_url,
  present_order, view_count, audience_votes_manual, submitted_at
)
values
  ('d1000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001',
   '빈집지도',
   '동네 빈집·폐가 위치를 주민이 직접 제보하고, 위험도와 처리 현황을 지도에서 한눈에 보는 서비스입니다. 사진 한 장과 위치만으로 제보가 끝나고, 담당 부서에는 주간 리포트가 자동으로 전달됩니다.',
   'https://github.com/example/binzip-map', 'https://binzip-map.example.app',
   'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://docs.google.com/presentation/d/demo-binzip/edit',
   1, 142, 0, timestamptz '2026-09-18 14:05:00+09'),

  ('d1000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002',
   '시장한스푼',
   '전통시장 점포의 오늘 물량과 마감 할인 정보를 상인이 1분 만에 올리고, 주민은 앱에서 실시간으로 확인합니다. 상인용 화면은 큰 글씨·버튼 3개로만 구성해 60대 이상도 바로 쓸 수 있게 만들었습니다.',
   'https://github.com/example/sijang-spoon', 'https://sijang-spoon.example.app',
   'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://docs.google.com/presentation/d/demo-sijang/edit',
   2, 98, 0, timestamptz '2026-09-18 14:12:00+09'),

  ('d1000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000003',
   '파란불 플러스',
   '보행이 느린 어르신이 횡단보도 앞에서 앱 버튼을 누르면 보행 신호가 연장되도록 요청하는 서비스입니다. 실제 신호 제어기 연동 전까지는 지자체 대시보드에 요청 데이터를 쌓아 신호 주기 개선 근거로 씁니다.',
   'https://github.com/example/blue-light-plus', 'https://blue-light-plus.example.app',
   null, 'https://docs.google.com/presentation/d/demo-bluelight/edit',
   3, 76, 0, timestamptz '2026-09-18 14:20:00+09'),

  ('d1000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000004',
   '오늘의 로컬박스',
   '반경 10km 안에서 수확한 농산물을 이웃끼리 공동구매하는 플랫폼입니다. 최소 수량이 모이면 자동으로 주문이 확정되고, 수령 장소는 마을회관·주민센터 등 기존 거점을 그대로 씁니다.',
   'https://github.com/example/local-box', 'https://local-box.example.app',
   'https://www.youtube.com/watch?v=dQw4w9WgXcQ', null,
   4, 121, 0, timestamptz '2026-09-18 14:28:00+09'),

  ('d1000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000005',
   '리스타트 스페이스',
   '비어 있는 청년 창업 공간·회의실을 시간 단위로 예약하는 서비스입니다. 흩어져 있던 5개 기관의 공간을 한 화면에 모으고, 중복 예약과 노쇼를 막는 체크인 QR을 붙였습니다.',
   'https://github.com/example/restart-space', 'https://restart-space.example.app',
   'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://docs.google.com/presentation/d/demo-restart/edit',
   5, 64, 0, timestamptz '2026-09-18 14:36:00+09'),

  ('d1000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000006',
   '마을날씨',
   '기상청 격자 예보가 놓치는 마을 단위 날씨를, 주민이 올린 관측 제보와 합쳐 보여 줍니다. 농작업·등하교 시간대에 맞춘 알림을 보내고, 미세먼지·서리 경보는 문자로도 발송합니다.',
   'https://github.com/example/village-weather', 'https://village-weather.example.app',
   null, 'https://docs.google.com/presentation/d/demo-weather/edit',
   6, 53, 0, timestamptz '2026-09-18 14:44:00+09'),

  ('d1000000-0000-4000-8000-000000000007', 'd0000000-0000-4000-8000-000000000007',
   '민원 두런두런',
   '접수된 민원을 자동으로 분류·요약하고 비슷한 건을 묶어 주는 담당자용 도구입니다. 같은 사안이 반복 접수되면 하나의 이슈로 합쳐 처리 현황을 한 번에 회신할 수 있습니다.',
   'https://github.com/example/minwon-doreon', null,
   'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://docs.google.com/presentation/d/demo-minwon/edit',
   7, 88, 0, timestamptz '2026-09-18 14:52:00+09'),

  ('d1000000-0000-4000-8000-000000000008', 'd0000000-0000-4000-8000-000000000008',
   '나침반: 귀촌 첫 1년',
   '귀농·귀촌 정착에 필요한 행정 절차와 지원사업을 시기별 체크리스트로 정리해 주는 서비스입니다. 거주 지역과 이주 시점을 입력하면 놓치기 쉬운 신청 마감일을 미리 알려 줍니다.',
   'https://github.com/example/nachimban', 'https://nachimban.example.app',
   null, null,
   8, 41, 0, timestamptz '2026-09-18 15:00:00+09')
on conflict do nothing;

-- ---------- 주제(트랙) ----------
-- 갤러리 주제 필터를 실제로 눌러볼 수 있도록 데모 제출작에 주제를 붙인다.
-- (0032 마이그레이션을 먼저 적용해야 한다)
update projects set track = v.track
from (values
  ('d1000000-0000-4000-8000-000000000001'::uuid, 'commerce'),
  ('d1000000-0000-4000-8000-000000000002'::uuid, 'commerce'),
  ('d1000000-0000-4000-8000-000000000003'::uuid, 'mobility'),
  ('d1000000-0000-4000-8000-000000000004'::uuid, 'esg'),
  ('d1000000-0000-4000-8000-000000000005'::uuid, 'education'),
  ('d1000000-0000-4000-8000-000000000006'::uuid, 'esg'),
  ('d1000000-0000-4000-8000-000000000007'::uuid, 'mobility'),
  ('d1000000-0000-4000-8000-000000000008'::uuid, 'education')
) as v(id, track)
where projects.id = v.id;

commit;

-- =============================================================
--  삭제(롤백) — 데모 데이터만 지운다. 실제 데이터는 영향 없음.
--  아래 블록의 주석을 풀고 실행할 것.
--  (projects 는 teams 삭제 시 on delete cascade 로 함께 지워지지만,
--   좋아요·댓글까지 확실히 정리되도록 명시적으로 먼저 지운다)
-- =============================================================
-- begin;
-- delete from projects where id::text like 'd1000000-0000-4000-8000-%';
-- delete from teams    where id::text like 'd0000000-0000-4000-8000-%';
-- commit;
