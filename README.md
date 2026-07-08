# 해커톤 운영 플랫폼

30팀 규모 오프라인 해커톤 운영용 웹사이트. **신청 → 팀 → 제출 → 투표 → 집계** 핵심 플로우 구현.

- **Next.js 14** (App Router, TypeScript) + **Tailwind CSS**
- **Supabase** (Postgres · Auth · RLS)
- 투표: 심사위원 채점 + 팀 상호 투표 + **테이블별 QR 관객 투표**

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
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (서버 전용, 관객 투표·QR 발급) |
| `NEXT_PUBLIC_SITE_URL` | 배포 주소 (QR 링크 생성). 로컬은 `http://localhost:3000` |

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
2. 참가자 로그인 → `/team` 에서 팀 생성/합류(2~4명) → **팀 확정**
3. 단계를 **개발 진행** 으로, 팀은 `/submit` 에서 프로젝트 제출
4. `/admin/qr` 에서 **테이블 수만큼 QR 생성 후 인쇄**
5. 발표 후 단계를 **투표 진행** 으로 → 관객은 테이블 QR 스캔, 팀 대표는 `/vote`
6. 심사위원은 `/judge` 에서 전 팀 채점
7. 단계를 **종료** 로 → `/results` 에서 최종 순위 확정

## 점수 산정

```
최종 = 심사(가중평균 100점 환산)·w1
     + 팀 상호 투표(최다 득표=100 정규화)·w2
     + 관객 투표(최다 득표=100 정규화)·w3
```

가중치(`w1/w2/w3`)는 `/admin` 에서 조정. 기본 50 / 25 / 25.

## 투표 무결성 (DB 강제)

- `votes(project_id, voter_id)` UNIQUE — 같은 작품 중복 투표 차단
- `block_self_vote` 트리거 — 자기 팀 투표 거부
- `apply_vote_rules` 트리거 — 투표 기간 외 차단 + 관객 토큰 표 수 차감
- 팀원 2~4명 검증 (팀 확정 시)
