// 요청이 렌더에 들어가기 전에 미들웨어가 내리는 판정.
//
// 이 판정을 미들웨어 안에 인라인으로 두면 테스트할 방법이 없다. 여기서 하는
// 실수는 조용하다 — 경로 매칭이 헐거우면 막아야 할 요청이 통과하고, 그래도
// 화면은 멀쩡해 보인다. 순수 함수로 꺼내 회귀 테스트로 고정한다.

// 운영 콘솔 경로인가.
//
// "/admin" 자신과 그 하위만 해당한다. startsWith("/admin") 하나로 판정하면
// "/administrators" 같은 남의 경로까지 잡고, 반대로 "/admin" 자신을 빠뜨리는
// 실수도 흔하다. 두 경우를 명시적으로 나눈다.
export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

// Supabase 세션 쿠키를 갖고 있는가.
//
// 값을 검증하지는 않는다 — 서명 확인은 뒤에서 하고, 여기서는 "세션이 있을
// 수도 있는 요청"과 "확실히 비로그인인 요청"만 가른다. 확실한 비로그인만
// 미들웨어에서 끊고, 나머지는 통과시켜 페이지가 직접 확인하게 한다.
export function hasSupabaseAuthCookie(cookieNames: readonly string[]): boolean {
  return cookieNames.some(
    (name) => name.startsWith("sb-") && name.includes("auth-token")
  );
}

// 렌더 전에 로그인으로 돌려보내야 하는 요청인가.
export function shouldBlockBeforeRender(
  pathname: string,
  cookieNames: readonly string[]
): boolean {
  return isAdminPath(pathname) && !hasSupabaseAuthCookie(cookieNames);
}
