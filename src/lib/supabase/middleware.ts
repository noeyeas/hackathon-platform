import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// 매 요청마다 Supabase 세션 쿠키를 갱신
export async function updateSession(request: NextRequest) {
  // 갤러리 무작위 정렬용 시드 — 방문(세션)당 하나.
  // 이번 요청의 서버 렌더에서 바로 읽히도록 request 쿠키에 먼저 주입하고,
  // 아래에서 response 쿠키로도 내려 브라우저에 저장한다(첫 방문 정렬 튐 방지).
  let newGallerySeed: string | null = null;
  if (!request.cookies.get("gallery_seed")) {
    newGallerySeed = Math.random().toString(36).slice(2, 12);
    request.cookies.set("gallery_seed", newGallerySeed);
  }

  let response = NextResponse.next({ request });

  // 비로그인 방문자는 갱신할 세션이 없다. Supabase 클라이언트를 만들지 않고
  // 곧바로 응답해 매 요청의 불필요한 작업을 없앤다.
  const hasAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
  if (!hasAuthCookie) {
    if (newGallerySeed) {
      response.cookies.set("gallery_seed", newGallerySeed, {
        sameSite: "lax",
        path: "/",
      });
    }
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() 는 매 요청 Auth 서버로 왕복한다. getClaims() 는 대신
  // JWKS(ES256 공개키)로 서명을 로컬 검증하므로 네트워크를 타지 않는다.
  // JWKS 는 auth-js 의 모듈 전역 캐시에 담겨 인스턴스당 1회만 받아온다.
  //
  // 세션 갱신은 그대로 유지된다 — getClaims() 는 내부에서 getSession() 을
  // 먼저 호출하고, 액세스 토큰이 만료됐으면 refresh 후 위 setAll 로 새
  // 쿠키를 내려보낸다. 토큰이 HS256 이면 자동으로 getUser() 로 폴백한다.
  //
  // 손상된 쿠키(base64url 이지만 JSON 이 아닌 값 등)에는 getClaims() 가
  // AuthError 가 아닌 예외를 그대로 던진다. 미들웨어는 모든 요청을 지나므로
  // 여기서 막지 않으면 사이트 전체가 500 이 된다. 실패하면 세션 갱신만
  // 건너뛰고, 페이지의 getUser() 가 비로그인으로 처리한다(RLS 로 보호됨).
  try {
    await supabase.auth.getClaims();
  } catch {
    // 갱신 실패 — 비로그인으로 계속 진행
  }

  // 새로 발급한 시드는 브라우저에도 저장(세션 쿠키)
  if (newGallerySeed) {
    response.cookies.set("gallery_seed", newGallerySeed, {
      sameSite: "lax",
      path: "/",
    });
  }

  return response;
}
