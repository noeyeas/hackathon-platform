// 예시 이미지(갤러리 썸네일) 업로드 한도.
//
// Vercel Functions 의 요청 본문 상한 4.5MB 는 플랫폼이 강제한다 —
// next.config 의 bodySizeLimit 을 아무리 올려도 그보다 큰 요청은 서버
// 액션이 실행되기도 전에 413 으로 끊긴다. 서버 검증은 도달조차 못 하므로
// 한도를 4MB 로 두고, 남는 0.5MB 를 나머지 폼 필드와 multipart 오버헤드
// 몫으로 남겨 둔다.
//
// 같은 값을 보는 곳이 넷이라 여기 모아 둔다:
//   · 서버 검증        — submit/actions.ts
//   · 전송 전 검증     — components/ActionForm.tsx
//   · 안내 문구        — submit/ProjectForm.tsx
//   · 버킷 제한        — 0060 마이그레이션
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_IMAGE_LABEL = "4MB";
