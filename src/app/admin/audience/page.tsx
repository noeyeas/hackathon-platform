import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { type Ranking } from "@/lib/types";
import { AdminPageHeader } from "../AdminPageHeader";
import { AudienceControls, type Batch } from "./AudienceControls";

export const dynamic = "force-dynamic";

export default async function AudiencePage() {
  // 레이아웃의 검사는 이 페이지의 렌더를 막지 못한다(병렬 렌더). 서비스 롤로
  // 조회하기 전에 여기서 직접 확인한다 — 실시간 득표가 걸려 있다.
  if (!(await requireAdmin())) return null;

  const admin = createAdminClient();
  const [{ data: settings }, { data: ballots }, { data: rankings }] =
    await Promise.all([
      admin
        .from("event_settings")
        .select("audience_voting_open, votes_per_ballot")
        .eq("id", 1)
        .single(),
      admin.from("audience_ballots").select("batch, used_at"),
      admin.from("rankings").select("*").returns<Ranking[]>(),
    ]);

  // 묶음별 발급/사용 집계
  const byBatch = new Map<string, { total: number; used: number }>();
  for (const b of ballots ?? []) {
    const key = (b.batch as string | null) ?? "";
    const cur = byBatch.get(key) ?? { total: 0, used: 0 };
    cur.total += 1;
    if (b.used_at) cur.used += 1;
    byBatch.set(key, cur);
  }
  const batches: Batch[] = [...byBatch.entries()]
    .map(([batch, c]) => ({
      batch,
      label: batch || "(라벨 없음)",
      total: c.total,
      used: c.used,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "ko"));

  const issued = ballots?.length ?? 0;
  const used = (ballots ?? []).filter((b) => b.used_at).length;

  const finalists = (rankings ?? []).filter((r) => r.is_finalist);
  const totalVotes = finalists.reduce((s, r) => s + (r.audience_votes ?? 0), 0);

  return (
    <div className="mx-auto max-w-2xl lg:mx-0">
      <AdminPageHeader
        title="전시 주민투표"
        desc="전시장에서 나눠줄 1회용 QR 투표권을 발급하고, 실시간 득표를 확인합니다."
      />

      <div className="mt-6">
        <AudienceControls
          votingOpen={settings?.audience_voting_open ?? false}
          votesPerBallot={settings?.votes_per_ballot ?? 3}
          batches={batches}
        />
      </div>

      <div className="card mt-4">
        <h2 className="font-bold">실시간 득표</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          투표권 {issued}장 발급 · {used}장 사용 · 총 {totalVotes}표. 이 숫자는
          운영진에게만 보입니다(주민·참가자 화면에는 종료 전까지 나오지 않습니다).
        </p>
        {finalists.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--muted)]">
            아직 전시 진출팀이 정해지지 않았습니다.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-[var(--line)]">
            {finalists.map((r) => {
              const pct =
                totalVotes > 0
                  ? Math.round((r.audience_votes / totalVotes) * 100)
                  : 0;
              return (
                <li key={r.project_id} className="flex items-center gap-3 py-2.5">
                  <span className="w-28 flex-none truncate font-medium">
                    {r.team_name}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-paper">
                    <div
                      className="h-full rounded-full bg-gold-bright"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-16 flex-none text-right text-sm font-semibold tabular-nums">
                    {r.audience_votes}표
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
