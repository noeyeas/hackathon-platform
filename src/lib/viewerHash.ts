import { createHash } from "node:crypto";

// 조회수 중복 집계를 막기 위한 방문자 식별자.
//
// 원본 IP 를 DB 에 남기지 않으려고 해시만 저장한다. 서버 비밀값을 섞어야
// 하는 이유: IP 공간은 좁아서 해시만으로는 후보를 전수 대입해 되맞출 수
// 있다. 비밀값이 없으면 익명 처리 효과가 사라진다.
//
// 로그인 사용자는 IP 가 바뀌어도(모바일 ↔ 와이파이) 같은 사람으로 세도록
// user id 를 쓴다. 비로그인은 IP + User-Agent 로 근사한다 — 완벽하진
// 않지만(같은 공유망 = 같은 방문자로 셈) 조회수 지표에는 충분하다.
export function viewerHash(input: {
  userId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}): string {
  const seed = input.userId
    ? `user:${input.userId}`
    : `anon:${input.ip ?? "unknown"}:${input.userAgent ?? ""}`;

  // 서버 전용 키를 HMAC 비밀값 대용으로 쓴다(별도 env 를 늘리지 않기 위해).
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createHash("sha256").update(`${secret}|${seed}`).digest("hex");
}

// Vercel 뒤에서는 x-forwarded-for 의 맨 앞이 실제 클라이언트 IP 다.
// (뒤쪽 값들은 프록시 체인이라 신뢰할 수 없다)
export function clientIp(headers: Headers): string | null {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim() || null;
  return headers.get("x-real-ip");
}
