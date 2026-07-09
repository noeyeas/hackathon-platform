import { createClient } from "@/lib/supabase/server";
import { SCORE_WEIGHTS, type Ranking, type EventPhase } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ResultsPage() {
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from("event_settings")
    .select("phase")
    .single();
  const phase = (settings?.phase ?? "signup") as EventPhase;
  const weights = SCORE_WEIGHTS;

  const { data: rankings } = await supabase
    .from("rankings")
    .select("*")
    .returns<Ranking[]>();

  // 팀별 팀원 구성 (팀 이름 hover 툴팁용)
  const { data: teamNotes } = await supabase
    .from("teams")
    .select("id, members_note");
  const noteByTeam = new Map(
    (teamNotes ?? []).map((t) => [t.id as string, t.members_note as string | null])
  );

  const showFinal = phase === "closed";

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">
        {showFinal ? "최종 결과 🏆" : "실시간 집계 현황"}
      </h1>
      <p className="mt-1 text-[var(--muted)]">
        가중치 · 심사 {pct(weights.judge)} / 팀 {pct(weights.team)} / 주민{" "}
        {pct(weights.audience)}
        {!showFinal && " · 투표 종료 후 최종 순위가 확정됩니다."}
      </p>

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
                className="border-b border-[var(--line)] last:border-0"
              >
                <td className="px-4 py-3 font-bold">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                </td>
                <td className="px-4 py-3">
                  {(() => {
                    const note = noteByTeam.get(r.team_id);
                    return (
                      <div
                        className={`font-semibold ${
                          note
                            ? "cursor-help decoration-dotted underline-offset-4 [text-decoration-line:underline]"
                            : ""
                        }`}
                        title={note ? `팀원 구성\n${note}` : undefined}
                      >
                        {r.team_name}
                      </div>
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
    </div>
  );
}

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}
