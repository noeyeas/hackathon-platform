import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type Ranking } from "@/lib/types";
import { VotingControls } from "./VotingControls";

export const dynamic = "force-dynamic";

export default async function VotingAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") redirect("/");

  const { data: settings } = await supabase
    .from("event_settings")
    .select("voting_open")
    .single();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, audience_votes_manual, teams(name)")
    .order("submitted_at");

  const rows =
    projects?.map((p) => ({
      id: p.id,
      team: (p.teams as unknown as { name: string } | null)?.name ?? "",
      title: p.title,
      audience: p.audience_votes_manual ?? 0,
    })) ?? [];

  const { data: rankings } = await supabase
    .from("rankings")
    .select("*")
    .returns<Ranking[]>();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">투표 관리</h1>
      <p className="mt-1 text-[var(--muted)]">
        온라인 투표를 열고 닫고, 주민 득표를 입력하면 집계가 즉시 반영됩니다.
      </p>

      <div className="mt-6">
        <VotingControls votingOpen={settings?.voting_open ?? false} rows={rows} />
      </div>

      <div className="card mt-4">
        <h2 className="mb-3 font-bold">실시간 집계</h2>
        {rankings && rankings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] text-left text-xs uppercase tracking-wider text-[var(--muted)]">
                  <th className="py-2">순위 / 팀</th>
                  <th className="py-2 text-right">심사</th>
                  <th className="py-2 text-right">팀표</th>
                  <th className="py-2 text-right">주민</th>
                  <th className="py-2 text-right">종합</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((r, i) => (
                  <tr
                    key={r.project_id}
                    className="border-b border-[var(--line)] last:border-0"
                  >
                    <td className="py-2">
                      <span className="mr-2 font-bold">{i + 1}</span>
                      {r.team_name}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {r.judge_score}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {r.team_votes}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {r.audience_votes}
                    </td>
                    <td className="py-2 text-right font-bold tabular-nums text-vote">
                      {r.final_score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">
            아직 집계할 데이터가 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}
