import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PHASE_LABEL, type EventPhase, type Ranking } from "@/lib/types";
import { PhaseControl } from "../PhaseControl";

export const dynamic = "force-dynamic";

const PHASES: EventPhase[] = [
  "signup",
  "team_building",
  "building",
  "submitted",
  "voting",
  "closed",
];

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
    .select("phase")
    .single();
  const phase = (settings?.phase ?? "signup") as EventPhase;

  const { data: rankings } = await supabase
    .from("rankings")
    .select("*")
    .returns<Ranking[]>();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">투표 관리</h1>
      <p className="mt-1 text-[var(--muted)]">
        현재 단계 · <b>{PHASE_LABEL[phase]}</b>
      </p>

      <div className="card mt-6">
        <h2 className="mb-1 font-bold">대회 단계 전환</h2>
        <p className="mb-3 text-sm text-[var(--muted)]">
          투표는 <b className="text-vote">투표 진행</b> 단계에서만 열립니다.
        </p>
        <PhaseControl current={phase} phases={PHASES} />
      </div>

      <div className="card mt-4">
        <h2 className="mb-3 font-bold">실시간 투표 집계</h2>
        {rankings && rankings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] text-left text-xs uppercase tracking-wider text-[var(--muted)]">
                  <th className="py-2">팀 / 작품</th>
                  <th className="py-2 text-right">팀 투표</th>
                  <th className="py-2 text-right">관객 투표</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((r) => (
                  <tr
                    key={r.project_id}
                    className="border-b border-[var(--line)] last:border-0"
                  >
                    <td className="py-2">
                      <div className="font-medium">{r.team_name}</div>
                      <div className="text-xs text-[var(--muted)]">
                        {r.title}
                      </div>
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {r.team_votes}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {r.audience_votes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">
            아직 집계할 투표가 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}
