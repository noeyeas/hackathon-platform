import { updateSession } from "@/lib/supabase/middleware";
import { type NextRequest } from "next/server";

// Next.js 16: middleware → proxy 규칙. 매 요청마다 Supabase 세션 갱신
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
