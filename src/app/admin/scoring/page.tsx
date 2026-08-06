import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { type Ranking } from "@/lib/types";
import { VotingControls } from "../voting/VotingControls";
import { ResultsToggle } from "./ResultsToggle";
import { completedByVoter, teamVoteTarget } from "@/lib/scoring";
import { AdminPageHeader } from "../AdminPageHeader";

export const dynamic = "force-dynamic";

export default async function ScoringProgressPage() {
  // 권한 검사는 admin/layout.tsx 가 처리한다.
  const admin = createAdminClient();
  const [
    { data: settings },
    { data: criteria },
    { data: projects },
    { data: judges },
    { data: judgeScores },
    { data: teamScores },
    { data: rankings },
    { data: allTeams },
  ] = await Promise.all([
    admin.from("event_settings").select("voting_open, phase").single(),
    admin.from("criteria").select("id"),
    admin
      .from("projects")
      .select("id, team_id, title, audience_votes_manual, teams(name)")
      .order("submitted_at"),
    admin.from("users").select("id, name, email").eq("role", "judge").order("name"),
    admin.from("judge_scores").select("judge_id, project_id, criteria_id"),
    admin.from("team_scores").select("voter_team_id, project_id, criteria_id"),
    admin.from("rankings").select("*").returns<Ranking[]>(),
    // 제출하지 않은 팀도 다른 팀을 평가하므로 전체 팀을 가져온다
    admin.from("teams").select("id, name").order("name"),
  ]);

  const criteriaCount = criteria?.length ?? 0;
  const projectList = projects ?? [];
  const submittedCount = projectList.length;
  const submittedTeamIds = new Set(projectList.map((p) => p.team_id));

  const judgeDone = completedByVoter(judgeScores, "judge_id", criteriaCount);
  const teamDone = completedByVoter(teamScores, "voter_team_id", criteriaCount);

  const judgeRows = (judges ?? []).map((j) => {
    const done = judgeDone.get(j.id)?.size ?? 0;
    return {
      key: j.id,
      name: j.name || j.email || "이름 없음",
      done: Math.min(done, submittedCount),
      total: submittedCount,
      complete: submittedCount > 0 && done >= submittedCount,
    };
  });

  // 평가 주체는 제출작이 아니라 팀 — 미제출 팀도 다른 팀을 평가하므로 전체 팀으로 행을 만든다.
  // 목표치도 팀마다 다르다(미제출 팀은 뺄 자기 몫이 없어 1개 더).
  const teamRows = (allTeams ?? []).map((t) => {
    const target = teamVoteTarget(submittedCount, submittedTeamIds.has(t.id));
    const done = teamDone.get(t.id)?.size ?? 0;
    return {
      key: t.id,
      name: t.name || "이름 없음",
      done: Math.min(done, target),
      total: target,
      complete: target > 0 && done >= target,
    };
  });

  const judgeComplete = judgeRows.filter((r) => r.complete).length;
  const teamCompleteCount = teamRows.filter((r) => r.complete).length;

  // 주민 수기 입력용 행
  const voteRows = projectList.map((p) => ({
    id: p.id,
    team: (p.teams as unknown as { name: string } | null)?.name ?? "",
    title: p.title,
    audience: p.audience_votes_manual ?? 0,
  }));

  return (
    <div className="mx-auto max-w-2xl lg:mx-0">
      <AdminPageHeader
        title="심사 · 평가 · 투표"
        desc="온라인 투표를 열고 닫고, 진행 현황과 집계를 한곳에서 관리합니다."
        aside={
          <>
            <Link href="/judge" className="btn-primary">
              심사위원 채점 화면 →
            </Link>
            <Link href="/vote" className="btn-ghost">
              팀 평가 화면 →
            </Link>
          </>
        }
      />

      {/* 온라인 투표 ON/OFF + 주민 수기 입력 (수기 입력은 자체 토글) */}
      <div className="mt-6">
        <VotingControls
          votingOpen={settings?.voting_open ?? false}
          rows={voteRows}
        />
      </div>

      {/* 결과 공개 ON/OFF */}
      <ResultsToggle initialOpen={settings?.phase === "closed"} />

      {/* 심사위원 진행 현황 */}
      <Section
        title="심사위원 진행 현황"
        summaryRight={`완료 ${judgeComplete}/${judgeRows.length}명`}
      >
        <p className="mb-3 text-xs text-[var(--muted)]">
          심사위원별로 전체 {submittedCount}팀 중 몇 팀을 채점했는지 표시합니다.
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
      </Section>

      {/* 참여 팀 진행 현황 */}
      <Section
        title="참여 팀 진행 현황"
        summaryRight={`완료 ${teamCompleteCount}/${teamRows.length}팀`}
      >
        <p className="mb-3 text-xs text-[var(--muted)]">
          각 팀이 자기 팀을 제외한 나머지 팀을 모두 평가했는지 표시합니다.
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
            등록된 팀이 없습니다.
          </p>
        )}
      </Section>

      {/* 실시간 집계 */}
      <Section title="실시간 집계">
        {rankings && rankings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="tbl min-w-[520px]">
              <thead>
                <tr>
                  <th>순위 / 팀</th>
                  <th className="!text-right">심사</th>
                  <th className="!text-right">팀 점수</th>
                  <th className="!text-right">주민</th>
                  <th className="!text-right">종합</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((r, i) => (
                  <tr key={r.project_id}>
                    <td>
                      <span className="mr-2 font-bold tabular-nums">{i + 1}</span>
                      {r.team_name}
                    </td>
                    <td className="num">{r.judge_score}</td>
                    <td className="num">{r.team_votes}</td>
                    <td className="num">{r.audience_votes}</td>
                    <td className="num font-bold text-navy">{r.final_score}</td>
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
      </Section>
    </div>
  );
}

// 접이식 섹션 (native <details>)
function Section({
  title,
  summaryRight,
  children,
}: {
  title: string;
  summaryRight?: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group card mt-4">
      <summary className="flex cursor-pointer list-none items-center justify-between">
        <span className="flex items-center gap-2 font-bold">
          <span className="text-[var(--muted)] transition group-open:rotate-90">
            ▶
          </span>
          {title}
        </span>
        {summaryRight && (
          <span className="text-sm text-[var(--muted)]">{summaryRight}</span>
        )}
      </summary>
      <div className="mt-4">{children}</div>
    </details>
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
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-paper">
        <div
          className={`h-full rounded-full ${
            complete ? "bg-team" : "bg-navy"
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
