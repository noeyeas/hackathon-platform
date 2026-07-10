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

  await supabase.auth.getUser();

  // 새로 발급한 시드는 브라우저에도 저장(세션 쿠키)
  if (newGallerySeed) {
    response.cookies.set("gallery_seed", newGallerySeed, {
      sameSite: "lax",
      path: "/",
    });
  }

  return response;
}
