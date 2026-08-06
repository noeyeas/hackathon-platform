import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

// 캐시되면 DB 를 안 치므로 매번 실행되어야 한다
export const dynamic = "force-dynamic";

// Supabase 무료 플랜은 7일간 쿼리가 없으면 프로젝트를 자동 일시중단한다.
// Vercel Cron 이 하루 한 번 이 라우트를 호출해 가벼운 쿼리를 흘려보내
// 중단을 막는다. 겸사겸사 DB 헬스체크 역할도 한다.
export async function GET(request: NextRequest) {
  // CRON_SECRET 이 설정돼 있으면 Vercel Cron 이 이 헤더를 자동으로 붙여준다.
  // 비밀값이 없을 때 통과시키면(기존 동작) 설정을 빠뜨린 순간 조용히 공개
  // 엔드포인트가 된다 — 빠뜨린 쪽이 잠기도록 fail-closed 로 둔다.
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const startedAt = performance.now();

  try {
    const supabase = createAdminClient();
    // 행 데이터는 받지 않고 개수만 — 가장 가벼운 실제 쿼리
    const { count, error } = await supabase
      .from("event_settings")
      .select("*", { head: true, count: "exact" });

    if (error) throw new Error(error.message);

    return NextResponse.json({
      ok: true,
      rows: count ?? 0,
      latencyMs: Math.round(performance.now() - startedAt),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: message, latencyMs: Math.round(performance.now() - startedAt) },
      { status: 503 }
    );
  }
}
