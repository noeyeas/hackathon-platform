import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// OAuth / 매직링크 로그인 후 콜백 — 코드를 세션으로 교환
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // 오픈 리다이렉트 방지: 반드시 사이트 내부 경로("/...")만 허용.
  // "//evil.com", "/\evil.com", "https://evil.com" 등은 거부하고 기본값 사용.
  const rawNext = searchParams.get("next") ?? "/team";
  const next =
    rawNext.startsWith("/") &&
    !rawNext.startsWith("//") &&
    !rawNext.startsWith("/\\")
      ? rawNext
      : "/team";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
