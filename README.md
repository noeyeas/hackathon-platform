# 해커톤 운영 플랫폼

30팀 규모 오프라인 해커톤 운영용 웹사이트. **신청 → 팀 → 제출 → 투표 → 집계** 핵심 플로우 구현.

- **Next.js 16** (App Router, TypeScript) + **Tailwind CSS**
- **Supabase** (Postgres · Auth · RLS)
- 평가: 심사위원 채점 + 팀 상호 평가 + **주민 스티커 투표(운영진 수기 집계)**

## 1. Supabase 준비

1. [supabase.com](https://supabase.com) 에서 프로젝트 생성
2. **SQL Editor** 에서 `supabase/migrations/0001_init.sql` 전체 실행
3. **Authentication → Providers** 에서 Google OAuth 활성화 (선택). 이메일 매직링크는 기본 활성
4. **Project Settings → API** 에서 URL / anon key / service_role key 복사

## 2. 환경 변수

`.env.local.example` 을 `.env.local` 로 복사하고 값 채우기:

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

## 3. 실행

```bash
npm install
npm run dev
```

http://localhost:3000

## 4. 운영자 / 심사위원 지정

가입 후 Supabase **Table Editor → users** 에서 해당 사용자의 `role` 을
`admin` 또는 `judge` 로 변경하면 각각 `/admin`, `/judge` 에 접근할 수 있습니다.

## 5. 대회 진행 순서

1. `/admin` 에서 단계를 **참가 신청** 으로 시작
2. `/admin/teams` 에서 선정된 팀과 **팀장 이메일** 등록 → 팀장이 그 이메일로
   로그인하면 자동 연결
3. 단계를 **개발 진행** 으로, 팀장은 `/submit` 에서 프로젝트 제출
   (마감 시각은 `event_settings.submit_deadline`)
4. 발표 후 `/admin/scoring` 에서 **온라인 평가 열기**
   → 심사위원은 `/judge`, 팀장은 `/vote` 에서 채점
5. 주민 스티커를 집계해 `/admin/scoring` 에 **수기 입력**
6. 단계를 **종료** 로 → `/results` 에서 최종 순위 확정

## 점수 산정

```
최종 = 심사(가중평균 100점 환산)·w1
     + 팀 상호 평가(최고점=100 정규화)·w2
     + 주민 투표(최다 득표=100 정규화)·w3
```

가중치(`w1/w2/w3`)는 `/admin` 에서 조정. 기본 50 / 25 / 25.

## 무결성 — 무엇을 DB가 막고, 무엇을 사람이 챙기는가

운영 중 오해가 없도록 **실제로 강제되는 것**만 적습니다.

### DB가 막아주는 것
- **심사 점수** — `judge_scores` 는 `(project_id, judge_id, criteria_id)` 단위로
  덮어써지고, RLS 상 본인 것과 운영진만 읽힙니다
- **팀 상호 평가** — `team_scores` 는 `(project_id, voter_team_id, criteria_id)`
  UNIQUE. 자기 팀 평가·팀장 여부는 서버 액션이 검증합니다
- **제출 마감** — `submit_open()` 조건이 `projects` 쓰기 정책에 걸려 있어
  마감 후에는 REST 를 직접 호출해도 수정되지 않습니다 (0033)
- **권한 상승** — `users.role` 등은 컬럼 권한 자체가 회수돼 있습니다 (0024)
- **실시간 순위·집계** — `rankings` 뷰(0022)와 주민 득표수 컬럼(0035)은
  Service Role 전용이라 종료 전에는 새지 않습니다
- **조회수 중복** — 방문자 해시 기준으로 1회만 집계됩니다 (0034)

### 사람이 챙겨야 하는 것
- **주민 투표는 운영진 수기 집계입니다** (`projects.audience_votes_manual`).
  QR·실시간 투표 경로는 0022 에서 제거됐으므로 **중복 투표를 DB가 걸러주지
  않습니다.** 현장에서 스티커 배부·집계 단계에 검증이 필요합니다
- **팀 인원(2~4명) 검증은 완화돼 있습니다** (0019). 운영진이 확인하세요
- **팀 생성·팀장 이메일 등록은 운영진 전용**입니다. 참가자는 팀장 이메일로
  로그인할 때 자동 연결만 됩니다
