import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { SCORE_WEIGHTS, type Ranking, type EventPhase } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ResultsPage() {
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from("event_settings")
    .select("phase, weights")
    .single();
  const phase = (settings?.phase ?? "signup") as EventPhase;
  // 집계 뷰(rankings)와 동일하게 event_settings.weights 를 사용 — 표시/계산 일치
  const weights =
    (settings?.weights as typeof SCORE_WEIGHTS | null) ?? SCORE_WEIGHTS;

  const showFinal = phase === "closed";

  // 실시간 순위는 종료 전 비공개. 운영진은 종료 전에도 미리보기 허용.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let isAdmin = false;
  if (user) {
    const { data: me } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    isAdmin = me?.role === "admin";
  }
  const canSeeRankings = showFinal || isAdmin;

  // rankings 뷰는 anon/authenticated 접근이 막혀 있으므로(0022) 공개 조건일 때만
  // Service Role 로 읽는다. 종료 전 일반 사용자에게는 순위/점수를 노출하지 않는다.
  const { data: rankings } = canSeeRankings
    ? await createAdminClient()
        .from("rankings")
        .select("*")
        .returns<Ranking[]>()
    : { data: null as Ranking[] | null };

  // 심사위원 배점 기준 (관리자에서 관리) — 결과 페이지에서 펼쳐볼 수 있게 노출
  const { data: criteria } = await supabase
    .from("criteria")
    .select("name, weight, max_score, description")
    .order("sort")
    .returns<
      { name: string; weight: number; max_score: number; description: string | null }[]
    >();

  // 팀별 팀원 구성 (팀 이름 hover 툴팁용)
  const { data: teamNotes } = await supabase
    .from("teams")
    .select("id, members_note");
  const noteByTeam = new Map(
    (teamNotes ?? []).map((t) => [t.id as string, t.members_note as string | null])
  );

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">
        {showFinal ? "최종 결과 🏆" : "집계 현황"}
      </h1>
      <p className="mt-1 text-[var(--muted)]">
        종합 산정 · 심사 {pct(weights.judge)} / 팀 {pct(weights.team)} / 주민{" "}
        {pct(weights.audience)}
        {!showFinal && " · 투표 종료 후 최종 순위가 공개됩니다."}
      </p>

      {isAdmin && !showFinal && (
        <div className="mt-4 rounded-lg bg-admin/10 px-4 py-3 text-sm text-admin">
          운영자 미리보기입니다. 참가자·관객에게는 종료 전까지 순위가 보이지 않습니다.
        </div>
      )}

      {!!criteria?.length && (
        <details className="group mt-4 rounded-2xl border border-[var(--line)] bg-white">
          <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold">
            <span>심사기준 {criteria.length}가지 보기</span>
            <span className="text-[var(--muted)] transition group-open:rotate-180">⌄</span>
          </summary>
          <ol className="flex flex-col border-t border-[var(--line)]">
            {criteria.map((c, i) => (
              <li
                key={c.name}
                className={`flex gap-3 px-4 py-3 ${
                  i !== criteria.length - 1 ? "border-b border-[var(--line)]" : ""
                }`}
              >
                <span className="mt-0.5 flex-none text-xs font-bold text-vote">
                  {pct(c.weight / 100)}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{c.name}</p>
                  {c.description && (
                    <p className="mt-0.5 text-xs text-[var(--muted)]">{c.description}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </details>
      )}

      {canSeeRankings ? (
      <div className="mt-6 overflow-x-auto rounded-2xl border border-[var(--line)]">
        <table className="w-full min-w-[560px] bg-white text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] bg-gray-50 text-left font-mono text-xs uppercase text-[var(--muted)]">
              <th className="px-4 py-3">순위</th>
              <th className="px-4 py-3">팀 / 작품</th>
              <th className="px-4 py-3 text-right">심사</th>
              <th className="px-4 py-3 text-right">팀 점수</th>
              <th className="px-4 py-3 text-right">주민표</th>
              <th className="px-4 py-3 text-right">종합</th>
            </tr>
          </thead>
          <tbody>
            {rankings?.map((r, i) => (
              <tr
                key={r.project_id}
                className={`border-b border-[var(--line)] last:border-0 ${
                  i === 0
                    ? "border-l-4 border-l-amber-400 bg-amber-50"
                    : i === 1
                      ? "border-l-4 border-l-slate-400 bg-slate-50"
                      : i === 2
                        ? "border-l-4 border-l-orange-400 bg-orange-50"
                        : ""
                }`}
              >
                <td className="px-4 py-3 font-bold">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                </td>
                <td className="px-4 py-3">
                  {(() => {
                    const note = noteByTeam.get(r.team_id);
                    return (
                      <Link
                        href={`/gallery/${r.project_id}`}
                        className="font-semibold hover:text-vote hover:underline"
                        title={note ? `팀원 구성\n${note}` : undefined}
                      >
                        {r.team_name}
                      </Link>
                    );
                  })()}
                  <div className="text-xs text-[var(--muted)]">{r.title}</div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {r.judge_score}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {r.team_votes}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {r.audience_votes}
                </td>
                <td className="px-4 py-3 text-right font-bold tabular-nums text-vote">
                  {r.final_score}
                </td>
              </tr>
            ))}
            {!rankings?.length && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[var(--muted)]">
                  아직 집계할 데이터가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-[var(--line)] bg-white px-6 py-12 text-center">
          <p className="text-lg font-semibold">투표 종료 후 순위가 공개됩니다</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            공정성을 위해 대회가 종료되기 전까지 실시간 순위와 점수는 비공개입니다.
          </p>
        </div>
      )}
    </div>
  );
}

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}
