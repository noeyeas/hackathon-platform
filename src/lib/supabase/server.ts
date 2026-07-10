import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// 서버 컴포넌트 / 라우트 핸들러용 Supabase 클라이언트 (로그인 사용자 세션)
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // 서버 컴포넌트에서 호출된 경우 무시 (middleware 가 세션 갱신 담당)
          }
        },
      },
    }
  );
}

// 쿠키 없는 공개 읽기 클라이언트 (anon 키, RLS 적용).
// 요청 스코프가 없어 unstable_cache 안에서도 안전하게 쓸 수 있다.
// 로그인 세션이 필요 없는 공용 데이터(공지·일정·마일스톤) 조회 전용.
export function createPublicClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: { getAll: () => [], setAll: () => {} },
    }
  );
}

// Service Role 클라이언트 — QR 토큰 발급, 주민 투표 기록 등 운영 전용.
// 반드시 서버에서만 사용 (RLS 우회).
export function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: { getAll: () => [], setAll: () => {} },
    }
  );
}
