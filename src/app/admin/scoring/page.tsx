import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ScoreRow = {
  judge_id?: string;
  voter_team_id?: string;
  project_id: string;
  criteria_id: string;
};

// (평가자 → 완료한 대상 프로젝트 집합) 계산
// 완료 = 한 대상에 대해 채점한 기준 수가 전체 기준 수 이상
function completedByVoter(
  rows: ScoreRow[] | null,
  voterKey: "judge_id" | "voter_team_id",
  criteriaCount: number
) {
  const filled = new Map<string, Set<string>>(); // `voter::project` → 채점한 기준들
  for (const r of rows ?? []) {
    const voter = r[voterKey];
    if (!voter) continue;
    const k = `${voter}::${r.project_id}`;
    if (!filled.has(k)) filled.set(k, new Set());
    filled.get(k)!.add(r.criteria_id);
  }
  const byVoter = new Map<string, Set<string>>(); // voter → 완료한 project 집합
  for (const [k, set] of filled) {
    if (criteriaCount === 0 || set.size < criteriaCount) continue;
    const [voter, project] = k.split("::");
    if (!byVoter.has(voter)) byVoter.set(voter, new Set());
    byVoter.get(voter)!.add(project);
  }
  return byVoter;
}

export default async function ScoringProgressPage() {
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

  const admin = createAdminClient();
  const [
    { data: criteria },
    { data: projects },
    { data: judges },
    { data: judgeScores },
    { data: teamScores },
  ] = await Promise.all([
    admin.from("criteria").select("id"),
    admin
      .from("projects")
      .select("id, team_id, title, teams(name)")
      .order("submitted_at"),
    admin.from("users").select("id, name, email").eq("role", "judge").order("name"),
    admin.from("judge_scores").select("judge_id, project_id, criteria_id"),
    admin.from("team_scores").select("voter_team_id, project_id, criteria_id"),
  ]);

  const criteriaCount = criteria?.length ?? 0;
  const projectList = projects ?? [];
  const teamCount = projectList.length;
  const teamTarget = Math.max(0, teamCount - 1); // 팀은 자기 팀 제외 나머지 평가

  const judgeDone = completedByVoter(judgeScores, "judge_id", criteriaCount);
  const teamDone = completedByVoter(teamScores, "voter_team_id", criteriaCount);

  const judgeRows = (judges ?? []).map((j) => {
    const done = judgeDone.get(j.id)?.size ?? 0;
    return {
      key: j.id,
      name: j.name || j.email || "이름 없음",
      done: Math.min(done, teamCount),
      total: teamCount,
      complete: teamCount > 0 && done >= teamCount,
    };
  });

  const teamRows = projectList.map((p) => {
    const teamName =
      (p.teams as unknown as { name: string } | null)?.name ?? "이름 없음";
    const done = teamDone.get(p.team_id)?.size ?? 0;
    return {
      key: p.id,
      name: teamName,
      done: Math.min(done, teamTarget),
      total: teamTarget,
      complete: teamTarget > 0 && done >= teamTarget,
    };
  });

  const judgeComplete = judgeRows.filter((r) => r.complete).length;
  const teamCompleteCount = teamRows.filter((r) => r.complete).length;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">심사 / 평가</h1>
      <p className="mt-1 text-[var(--muted)]">
        심사위원과 참여 팀이 모든 팀 평가를 마쳤는지 확인합니다.
      </p>

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link href="/judge" className="btn-primary">
          심사위원 채점 화면 →
        </Link>
        <Link
          href="/vote"
          className="rounded-lg border border-[var(--line)] px-4 py-2 font-medium text-[var(--muted)] hover:text-ink"
        >
          팀 평가 화면 →
        </Link>
      </div>

      {/* 심사위원 진행 현황 */}
      <section className="card mt-6">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-bold">심사위원 진행 현황</h2>
          <span className="text-sm text-[var(--muted)]">
            완료 {judgeComplete}/{judgeRows.length}명
          </span>
        </div>
        <p className="mb-3 text-xs text-[var(--muted)]">
          심사위원별로 전체 {teamCount}팀 중 몇 팀을 채점했는지 표시합니다.
        </p>
        {judgeRows.length > 0 ? (
          <ul className="flex flex-col divide-y divide-[var(--line)]">
            {judgeRows.map((r) => (
              <ProgressRow
                key={r.key}
                name={r.name}
                done={r.done}
                total={r.total}
                complete={r.complete}
              />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--muted)]">
            등록된 심사위원이 없습니다.
          </p>
        )}
      </section>

      {/* 참여 팀 진행 현황 */}
      <section className="card mt-4">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-bold">참여 팀 진행 현황</h2>
          <span className="text-sm text-[var(--muted)]">
            완료 {teamCompleteCount}/{teamRows.length}팀
          </span>
        </div>
        <p className="mb-3 text-xs text-[var(--muted)]">
          각 팀이 자기 팀을 제외한 {teamTarget}팀을 모두 평가했는지 표시합니다.
        </p>
        {teamRows.length > 0 ? (
          <ul className="flex flex-col divide-y divide-[var(--line)]">
            {teamRows.map((r) => (
              <ProgressRow
                key={r.key}
                name={r.name}
                done={r.done}
                total={r.total}
                complete={r.complete}
              />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--muted)]">
            제출한 참여 팀이 없습니다.
          </p>
        )}
      </section>
    </div>
  );
}

function ProgressRow({
  name,
  done,
  total,
  complete,
}: {
  name: string;
  done: number;
  total: number;
  complete: boolean;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className="w-28 flex-none truncate font-medium">{name}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full ${
            complete ? "bg-team" : "bg-vote"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-16 flex-none text-right text-sm tabular-nums text-[var(--muted)]">
        {done}/{total}
      </span>
      <span
        className={`w-14 flex-none text-right text-sm font-semibold ${
          complete ? "text-team" : "text-[var(--muted)]"
        }`}
      >
        {complete ? "완료" : "진행중"}
      </span>
    </li>
  );
}
