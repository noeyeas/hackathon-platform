// 서버 액션에서 Supabase/Postgres 원문 에러를 사용자에게 그대로 노출하지 않기
// 위한 헬퍼. 원문은 서버 로그(Vercel Functions)에 남겨 운영진이 추적할 수 있게
// 하고, 사용자에게는 안전한 한국어 문구만 반환한다.
// 사용: `if (error) return { error: safeError(error, "저장 실패...") };`
export function safeError(
  error: unknown,
  userMessage = "처리 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요."
): string {
  console.error("[action]", detailOf(error));
  return userMessage;
}

// 운영 콘솔 전용. 원문을 그대로 보여준다 — 감추는 게 아니라 드러내는 쪽이 의도다.
//
// 행사 당일 운영진에게는 "저장에 실패했어요" 보다 "duplicate key ... teams_name_key"
// 가 훨씬 쓸모 있다. 보는 사람이 이미 운영진이므로 감출 대상도 아니다.
// 다만 원문을 UI 로만 흘리면 화면을 닫는 순간 사라지므로, safeError 와 똑같이
// 서버 로그에도 남긴다 — 기존 admin 액션들은 이 로깅이 빠져 있었다.
//
// 일반 사용자 대상 액션에는 쓰지 말 것. 거기서는 safeError 를 쓴다.
export function adminError(
  error: unknown,
  fallback = "처리 중 문제가 발생했어요."
): string {
  const detail = detailOf(error);
  console.error("[admin-action]", detail);
  return detail || fallback;
}

function detailOf(error: unknown): string {
  return error instanceof Error
    ? error.message
    : typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error);
}
