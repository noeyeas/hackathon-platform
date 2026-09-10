# 🏆 해커톤 운영 플랫폼 (Hackathon Platform)

> **30팀 규모 오프라인 해커톤의 신청 → 팀 → 제출 → 평가 → 집계 전 과정을 담당하는 운영 웹 플랫폼**
>
> 🔗 **Live**: [hackathon-platform-sy04.vercel.app](https://hackathon-platform-sy04.vercel.app)

---

## 📌 1. 프로젝트 개요 (Overview)

- **개발 기간**: 2026.07 ~ (운영 중) · 커밋 242개 · 마이그레이션 49개
- **배경 및 목적**: 30팀 규모 오프라인 해커톤의 운영을 구글 폼 + 스프레드시트 + 단톡방 조합으로 처리하던 방식을 하나의 웹 플랫폼으로 통합했습니다.

  기존 방식에서는 **① 신청·팀 편성·제출물이 서로 다른 문서에 흩어져 대조가 필요했고, ② 심사위원이 종이에 매긴 점수를 운영진이 옮겨 적어 계산 실수가 생겼으며, ③ 중간 순위가 새면 이후 평가가 흔들리고, ④ 대회 당일 공지·일정 변경이 단톡방에 묻혔습니다.**
  이를 각각 *단일 DB 스키마 · 서버측 점수 산정 · RLS 기반 집계 은닉 · 단계(phase) 기반 화면 전환* 으로 풀었습니다.

- **주요 사용자**: 참가자(팀장/팀원) · 심사위원 · 운영진 — 세 역할이 같은 사이트에서 서로 다른 화면을 봅니다.
- **운영 특성**: 대회 당일 몇 시간에 트래픽이 집중되고, **되돌릴 수 없는 채점 데이터**를 다룹니다.

---

## ✨ 2. 핵심 기능 (Key Features)

### 🙋 참가자

- **매직링크 / Google 로그인** — 비밀번호 없이 이메일만으로 참여
- **팀 자동 연결** — 운영진이 등록한 팀장 이메일로 로그인하면 팀에 자동 연결
- **팀원 모집 게시판** (`/recruit`) — 포지션별 모집글, 연락처는 로그인 사용자에게만 공개
- **제출** (`/submit`) — 레포·데모·영상·발표자료 링크 제출, 운영진이 **제출을 닫으면 수정 불가**
- **갤러리** (`/gallery`) — 전 팀 제출물 열람, 응원(좋아요) · 댓글 · 조회수
- **팀 상호 평가** (`/vote`) — 팀장이 자기 팀을 제외한 팀에 채점

### 🙋 전시장 주민

- **주민투표** (`/exhibit/<코드>`) — 로그인 없이 전시장에서 받은 1회용 QR 투표권으로 진출팀에 투표

### ⚖️ 심사위원

- **채점 콘솔** (`/judge`) — 평가 기준별 점수 입력, 진행률 표시, 언제든 수정 가능

### 🛡️ 운영진

- **단계 제어** (`/admin`) — 참가 신청 → 개발 진행 → 평가 → 종료. 단계에 따라 전 사이트 화면이 바뀜
- **팀 관리 · 공지 · 일정** — 팀/팀장 등록, 공지 발행, 마일스톤 타임라인 편집
- **집계 콘솔** (`/admin/scoring`) — 심사·상호평가 자동 집계, 가중치 조정
- **전시 주민투표** (`/admin/audience`) — QR 투표권 발급·인쇄·회수, 투표 열고 닫기, 투표권당 표 수
- **참가자 화면 열고 닫기** (`/admin`) — 팀 정보 수정·프로젝트 제출 스위치 (날짜가 아니라 이 토글이 유일한 기준)
- **결과 공개 제어** — 종료 단계 전까지 순위·득표수는 **DB 레벨에서** 차단

---

## 🛠️ 3. 기술 스택 (Tech Stack)

| 구분 | 기술 스택 |
| :--- | :--- |
| **Frontend** | Next.js 16 (App Router, Server Components), React 19, TypeScript |
| **Styling** | Tailwind CSS 3, Pretendard / Archivo Black 로컬 폰트 |
| **Backend** | Next.js Server Actions, Route Handlers |
| **Database** | Supabase (PostgreSQL · Auth · **RLS** · Service Role) |
| **Test** | `node --test` + PGlite (인메모리 Postgres 로 RLS·집계 검증) |
| **Deployment** | Vercel (프론트·서버), Supabase (DB), Cron 헬스체크 |

---

## 📐 4. 아키텍처 (Architecture)

```
[브라우저]
   │  Server Component 렌더 / Server Action 호출
   ▼
[Next.js on Vercel]
   ├── anon key 클라이언트 ── RLS 적용 ──┐
   └── Service Role 클라이언트 ─────────┤   (운영진 집계·조회수 전용, 서버에서만)
                                        ▼
                            [Supabase PostgreSQL]
                        RLS 정책 + 컬럼 단위 GRANT + 뷰
```

**핵심 원칙: anon key 는 공개 값이다.** 화면에 그리지 않는 것으로는 아무것도 보호되지 않으므로,
가려야 하는 데이터는 전부 **DB 권한(RLS · 컬럼 GRANT · 뷰)** 으로 막았습니다.

```
src/
├── app/
│   ├── (참가자)  page · recruit · team · submit · gallery · vote · mypage · notice · results
│   ├── login · auth/  매직링크 / Google OAuth 콜백
│   ├── exhibit/  [code]  전시장 QR 주민투표 (로그인 없음)
│   ├── judge/    심사위원 채점
│   ├── admin/    teams · scoring · audience · announcements · schedule · voting
│   └── api/health  Supabase 자동 일시중단 방지용 크론 엔드포인트
├── components/   Nav · Toast · Reveal · HeroTimeline · LikeButton · ViewPing …
└── lib/          auth · authGate · ballot · scoring · submitWindow · teamEdit · viewerHash · format …
supabase/migrations/  0001 → 0049 (스키마 = 보안 정책 이력)
test/                 rankings · scoring · submitWindow · viewerHash · format · authGate · ballot
```

### 왜 이 구조인가 (설계 의사결정)

| 결정 | 이유 |
| :--- | :--- |
| **앱 검증이 아닌 RLS 로 방어** | `anon` 키가 클라이언트에 노출되는 구조라 누구나 PostgREST 를 직접 호출할 수 있습니다. 앱 코드의 검증은 우회 가능하므로 최종 방어선을 DB 에 뒀습니다. |
| **Service Role 은 서버 전용** | 순위·주민 득표수처럼 종료 전까지 새면 안 되는 값은 RLS 로 완전히 잠그고, 운영진 화면만 서버에서 Service Role 로 읽습니다. |
| **주민 투표는 1회용 QR 투표권** | 로그인을 요구하면 전시장에서 아무도 투표하지 않고, 그냥 열어두면 중복 투표를 막을 수 없습니다. 종이 투표권 한 장 = 코드 한 개로 1인 n표를 DB 가 보장합니다 (0045). 스티커 수기 집계는 이 경로로 대체됐습니다. |
| **PGlite 로 테스트** | RLS·집계 로직은 목(mock)으로는 검증이 안 됩니다. 인메모리 Postgres 에 실제 마이그레이션을 얹어 정책 자체를 테스트합니다. |
| **단계(phase) 하나로 전 사이트 제어** | 대회 당일 운영진이 만질 스위치를 하나로 줄여, 화면별 개별 토글을 잘못 건드릴 여지를 없앴습니다. |

---

## 💡 5. 기술적 도전 및 문제 해결 (Troubleshooting & Key Learnings)

### 1) 참가자 JWT 로 관리자 권한 탈취가 가능했던 문제 (0021 → 0024)

- **문제**: `revoke update (role, email) on users` 로 컬럼만 회수했는데, 실제로 참가자 토큰으로 `PATCH /rest/v1/users {"role":"admin"}` 이 **성공**했습니다. Postgres 는 테이블 단위 UPDATE 권한이 있으면 컬럼 단위 revoke 를 무시합니다.
- **해결**: 테이블 단위 UPDATE/INSERT 를 전부 회수한 뒤 안전한 컬럼만 다시 GRANT 하는 방식으로 전환했습니다. 이후 같은 패턴을 `teams`·`projects`·`recruit_posts` 에도 일괄 적용했습니다.
- **배움**: 권한 회수는 "좁게 빼기"가 아니라 **전부 잠그고 필요한 것만 열기**여야 합니다.

### 2) 최종 점수의 25% 가 실시간으로 새던 문제 (0022 → 0035)

- **문제**: 실시간 순위 유출을 막으려 `rankings` 뷰를 잠갔지만, 정작 `projects.audience_votes_manual`(주민 득표수) 컬럼은 공개 상태였습니다. `GET /rest/v1/projects?select=title,audience_votes_manual` 한 줄로 읽혔습니다.
- **해결**: `projects` 테이블 SELECT 를 회수하고 표시용 컬럼만 재부여해 득표수를 Service Role 전용으로 돌렸습니다.
- **배움**: 뷰를 잠가도 **원본 테이블 경로가 열려 있으면 의미가 없습니다.** 데이터 단위로 노출 경로를 전수 확인해야 합니다.

### 3) 대회가 끝난 뒤에도 제출물을 고칠 수 있던 문제 (0033)

- **문제**: `submit_deadline` 컬럼은 0001부터 있었으나 앱도 RLS 도 읽지 않는 죽은 컬럼이었습니다. 채점 근거 자료를 심사 중에도, 종료 후에도 수정할 수 있었습니다.
- **해결**: 앱(`canSubmitProject()`)과 RLS 정책 두 겹으로 마감을 강제했습니다. anon 키로 REST 를 직접 호출해도 마감 후 쓰기가 거부됩니다. 운영진(Service Role)만 예외로 남겼습니다.

### 4) 개인 연락처·응원 기록이 스크래핑 가능했던 문제 (0036)

- **문제**: 모집글의 카톡 ID·전화번호(`recruit_posts.contact`)와 "누가 어느 팀을 응원했는지"(`project_likes.liker_key`)가 REST 로 통째로 조회됐습니다. 화면에 안 그릴 뿐이었습니다.
- **해결**: 게시판 본문은 비로그인에게 열어두되 **연락처 컬럼만** `authenticated` 로 제한하고, `liker_key` 는 완전히 가렸습니다.

### 5) 4번 수정이 만든 회귀 — 응원 수 집계 붕괴 (0037)

- **문제**: `project_likes` 의 테이블 SELECT 를 회수하자 갤러리·마이페이지의 응원 수가 전부 `permission denied` 로 깨졌습니다. `count(*)` 는 컬럼 단위 권한으로 실행되지 않고 **테이블 단위 SELECT 를 요구**합니다.
- **해결**: `(project_id, 개수)` 만 내보내는 `project_like_counts` 뷰를 두고 화면이 이 뷰를 읽게 했습니다. 뷰는 소유자 권한으로 실행되므로(`security_invoker = false`) 집계는 통과하고 `liker_key` 는 여전히 가려집니다.
- **배움**: 보안 조치는 **읽기 경로를 함께 설계**해야 합니다. 막는 것과 필요한 만큼 여는 것이 한 세트입니다.

### 6) 조회수 무한 조작 (0034)

- **문제**: 방어가 쿠키(`vw_<id>`) 하나뿐이라 시크릿 창이면 조회수를 무한히 올릴 수 있었습니다.
- **해결**: 로그인 사용자는 user id, 비로그인은 `IP + User-Agent` 를 서버 비밀값과 함께 해싱해 `(project_id, viewer_hash)` PK 로 1회만 집계합니다. **원본 IP 는 저장하지 않아** 로그에서 개인을 역추적할 수 없습니다.

### 7) 무료 티어 Supabase 의 자동 일시중단

- **문제**: 대회 준비 기간에 트래픽이 없으면 Supabase 프로젝트가 일시중단돼, 정작 필요한 날 DB 가 죽어 있을 위험이 있었습니다.
- **해결**: `CRON_SECRET` 으로 인증되는 `/api/health` 엔드포인트를 두고 크론으로 주기 호출합니다. 시크릿 미설정 시 401 로 닫히므로 **설정 누락이 곧 방어 실패**임을 README 에 명시했습니다.

### 8) 프로필 한 줄 때문에 로그인 자체가 막힌 문제 (0047)

- **문제**: Google 로그인이 `500 unexpected_failure` 로 끝났습니다. 가입 트리거(`handle_new_user`)가 `on conflict (id)` 만 처리해, 같은 이메일이 다른 id 로 이미 있으면 `users.email` UNIQUE 위반이 났습니다. 트리거는 `auth.users` insert 와 같은 트랜잭션이라 **가입 전체가 롤백**되고 그 사용자는 영구히 로그인할 수 없었습니다.
- **해결**: 프로필 생성 실패를 경고로 내리고 로그인은 통과시켰습니다. 대신 프로필 행이 없는 사용자가 생길 수 있어, 마이그레이션에 고아 행 점검 쿼리를 함께 남겼습니다.
- **배움**: 인증 경로에 걸린 트리거는 **실패해도 인증을 막지 않아야** 합니다.

### 9) 투표권 한 장 단위여서 한 사람이 여러 장을 쓸 수 있던 문제 (0048)

- **문제**: 0045 의 중복 방지 단위는 "사람"이 아니라 "투표권 한 장"입니다. 전시장에서 QR 은 각자 폰으로 흩어져 찍히니, 두 장 집어가는 것을 배부자의 눈으로 잡을 수 없었습니다.
- **해결**: 투표한 기기에 무작위 쿠키 표시를 남겨 투표권에 기록하고, 같은 기기가 다른 투표권을 찍으면 거절합니다. IP 를 쓰지 않은 이유는 전시장 와이파이가 모두 같은 IP 라 정상 투표까지 막히기 때문입니다. 한 폰으로 대신 찍어드리는 경우를 위해 **예외 투표권**을 남겼습니다.
- **한계**: 시크릿창·폰 두 대면 우회됩니다. 목표는 가벼운 중복을 걷어내는 것이고, 작정한 조작은 배부 통제(1인 1장)로 막습니다.

---

## 📊 6. 점수 산정

2단계로 나눠 뽑습니다 (0040). 주민 투표는 총점에 섞이지 않고, 진출팀 안에서 순서만 가릅니다.

```
1차 (최종발표)  점수 = 심사(100점 환산)·w_judge + 팀 상호 평가(100점 환산)·w_team
                       ─────────────────────────────────────────────────────
                                     w_judge + w_team          ← 만점이 100 이 되도록 되돌림
                → 상위 finalist_count(기본 15)팀이 전시 진출

2차 (전시)      진출팀만 대상으로 주민투표 득표수 순
                → 1위 노원구청장 표창, 2~4위 광운대학교 우수상
```

가중치(`weights`)와 진출 팀 수(`finalist_count`)는 `/admin` 에서 조정합니다. 기본값 **심사 0.5 / 팀 상호 0.25** (2:1), 진출 팀 수 기본 **15** (0049).

### 무엇을 DB 가 막고, 무엇을 사람이 챙기는가

운영 중 오해가 없도록 **실제로 강제되는 것**만 적습니다.

**DB 가 막아주는 것**

- **심사 점수** — `judge_scores` 는 `(project_id, judge_id, criteria_id)` 단위로 덮어써지고, RLS 상 본인 것과 운영진만 읽습니다
- **팀 상호 평가** — `team_scores` 는 `(project_id, voter_team_id, criteria_id)` UNIQUE. 자기 팀 평가·팀장 여부는 서버 액션이 검증합니다
- **제출·팀 수정 잠금** — `submit_open()` / `team_edit_open()` 조건이 `projects` · `teams` 쓰기 정책에 걸려 있어, 운영진이 닫으면 REST 를 직접 호출해도 수정되지 않습니다 (0033 · 0046)
- **권한 상승** — `users.role` 등은 컬럼 권한 자체가 회수돼 있습니다 (0024)
- **실시간 순위·집계** — `rankings` 뷰(0022)와 주민투표 테이블(`audience_ballots` · `audience_votes`, 0045)은 Service Role 전용이라 종료 전에는 새지 않습니다
- **주민 중복 투표** — `audience_votes` 의 `(ballot_code, project_id)` PK 가 같은 팀 두 표를 막고, 트리거가 투표권당 표 수 상한과 사용 여부를 지킵니다 (0045)
- **조회수 중복** — 방문자 해시 기준으로 1회만 집계됩니다 (0034)

**사람이 챙겨야 하는 것**

- **투표권 배부는 사람이 챙깁니다.** 기기 단위 차단(0048)이 가벼운 중복은 걷어내지만 시크릿창·다른 폰이면 우회됩니다. 안내데스크에서 1인 1장 배부를 지켜야 합니다
- **투표권당 표 수는 투표를 열기 전에 정하세요.** 열려 있는 동안에는 바꿀 수 없습니다 — 앞사람이 더 많은 표를 쓴 셈이 되기 때문입니다
- **팀 인원(2~4명) 검증은 완화돼 있습니다** (0019). 운영진이 확인하세요
- **팀 생성·팀장 이메일 등록은 운영진 전용**입니다. 참가자는 팀장 이메일로 로그인할 때 자동 연결만 됩니다

---

## 🚀 7. 실행 방법 (Getting Started)

### 7-1. Supabase 준비

1. [supabase.com](https://supabase.com) 에서 프로젝트 생성
2. **SQL Editor** 에서 `supabase/migrations/` 의 `0001` 부터 순서대로 실행
3. **Authentication → Providers** 에서 Google OAuth 활성화 (선택). 이메일 매직링크는 기본 활성
4. **Project Settings → API** 에서 URL / anon key / service_role key 복사

### 7-2. 환경 변수

```bash
cp .env.local.example .env.local
```

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (서버 전용, 운영 집계·조회수. **클라이언트 노출 금지**) |
| `NEXT_PUBLIC_SITE_URL` | 배포 주소. 로컬은 `http://localhost:3000` |
| `CRON_SECRET` | `/api/health` 크론 인증용. **없으면 헬스체크가 401 로 닫혀** Supabase 자동 일시중단 방지가 동작하지 않습니다 |

### 7-3. 실행

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # RLS·집계 테스트 (PGlite)
```

### 7-4. 운영자 / 심사위원 지정

가입 후 Supabase **Table Editor → users** 에서 해당 사용자의 `role` 을
`admin` 또는 `judge` 로 변경하면 각각 `/admin`, `/judge` 에 접근할 수 있습니다.

---

## 🗓️ 8. 대회 진행 순서 (운영 매뉴얼)

1. `/admin` 에서 단계를 **참가 신청** 으로 시작
2. `/admin/teams` 에서 선정된 팀과 **팀장 이메일** 등록 → 팀장이 그 이메일로 로그인하면 자동 연결
3. 단계를 **개발 진행** 으로, 팀장은 `/submit` 에서 프로젝트 제출 (`/admin` 의 **프로젝트 제출** 스위치로 열고 닫습니다)
4. 발표 후 `/admin/scoring` 에서 **온라인 평가 열기** → 심사위원은 `/judge`, 팀장은 `/vote` 에서 채점
5. 전시 기간에 `/admin/audience` 에서 **QR 투표권을 발급·인쇄**해 배부하고 **주민투표 열기** → 주민은 `/exhibit/<코드>` 에서 진출팀에 투표
6. 단계를 **종료** 로 → `/results` 에서 최종 순위 확정
