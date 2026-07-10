// 서버 액션에서 Supabase/Postgres 원문 에러를 사용자에게 그대로 노출하지 않기
// 위한 헬퍼. 원문은 서버 로그(Vercel Functions)에 남겨 운영진이 추적할 수 있게
// 하고, 사용자에게는 안전한 한국어 문구만 반환한다.
// 사용: `if (error) return { error: safeError(error, "저장 실패...") };`
export function safeError(
  error: unknown,
  userMessage = "처리 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요."
): string {
  const detail =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error);
  console.error("[action]", detail);
  return userMessage;
}
