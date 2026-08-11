import { updateSession } from "@/lib/supabase/middleware";
import { shouldBlockBeforeRender } from "@/lib/authGate";
import { NextResponse, type NextRequest } from "next/server";

// Next.js 16: middleware → proxy 규칙. 매 요청마다 Supabase 세션 갱신
export async function proxy(request: NextRequest) {
  // 운영 콘솔은 레이아웃의 redirect() 만으로는 못 막는다 — 레이아웃과 페이지가
  // 나란히 렌더돼, 권한 판정이 끝나기 전에 페이지가 이미 서비스 롤로 데이터를
  // 조회해 HTML 에 실어 보낸다(응답은 200 + meta refresh 라 브라우저만 튕긴다).
  // 세션 쿠키조차 없는 요청은 렌더가 시작되기 전인 여기서 끊는다.
  const { pathname } = request.nextUrl;
  const cookieNames = request.cookies.getAll().map((c) => c.name);
  if (shouldBlockBeforeRender(pathname, cookieNames)) {
    const login = new URL("/login", request.url);
    // 로그인 페이지는 ?redirect= 를 읽어 콜백의 next 로 넘긴다.
    login.searchParams.set("redirect", pathname);
    return NextResponse.redirect(login);
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
