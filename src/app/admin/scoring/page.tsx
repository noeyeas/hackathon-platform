import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { VotingControls } from "../voting/VotingControls";
import { completedByVoter, teamVoteTarget } from "@/lib/scoring";
import { requireAdmin } from "@/lib/auth";
import { fetchAll } from "@/lib/fetchAll";
import { teamLabel } from "@/lib/format";
import { AutoRefresh } from "@/components/AutoRefresh";
import { AdminPageHeader } from "../AdminPageHeader";
import { finalistsLocked } from "@/lib/scoreLock";
import { fetchAttendanceScores, ATTENDANCE_SHEET_URL } from "@/lib/attendanceSheet";

export const dynamic = "force-dynamic";

// 팀 상호평가 운영 화면.
//
// 운영 결정(10/8): 본선 심사위원 점수는 종이 채점표로 사이트 밖에서 집계한다.
// 이 화면은 심사 입력(종이 채점표 옮겨 적기)과 심사가 섞인 집계표를 걷어내고,
// 팀 상호평가를 열고 닫는 스위치 · 상호평가 결과 · 팀별 진행 현황만 둔다.
// 결과표에는 「입장·참석 체크」 시트의 발표(5)·참여도(5) 점수도 함께 보여준다.
// 결과는 팀장이 저장하는 즉시 반영되고(30초마다 자동 갱신), CSV 로 받아
// 종이 심사 점수와 합산할 수 있다.
//
// 상호평가 점수는 rankings 뷰의 team_norm 과 같은 식이다:
//   받은 점수 합 ÷ 받은 칸들의 만점 합 × 100
// (기권 팀이 준 점수·기권 팀이 받은 점수는 뺀다 — 0056.)
export default async function ScoringProgressPage() {
  // 레이아웃의 검사는 이 페이지의 렌더를 막지 못한다(병렬 렌더). 서비스 롤로
  // 조회하기 전에 여기서 직접 확인한다 — 점수가 걸려 있다.
  if (!(await requireAdmin())) return null;

  const admin = createAdminClient();
  const [
    { data: settings },
    { data: criteria },
    { data: projects },
    { data: teamScores },
    { data: allTeams },
  ] = await Promise.all([
    admin.from("event_settings").select("voting_open").single(),
    admin
      .from("criteria")
      .select("id, name, max_score, sort")
      .eq("round", "final")
      .order("sort"),
    admin
      .from("projects")
      .select("id, team_id, title, teams(name, team_no, status)")
      .order("submitted_at"),
    // 채점 행은 1,000행을 넘기므로 끝까지 페이지를 넘겨 읽는다(fetchAll 주석 참고).
    // 투표 중에도 행이 계속 들어오므로 페이지 경계가 흔들리지 않게 순서를 고정한다.
    fetchAll(() =>
      admin
        .from("team_scores")
        .select("id, voter_team_id, project_id, criteria_id, score")
        .order("id")
    ),
    // 제출하지 않은 팀도 다른 팀을 평가하므로 전체 팀을 가져온다.
    admin
      .from("teams")
      .select("id, name, team_no")
      .neq("status", "withdrawn") // 기권 팀은 평가 주체도 대상도 아니다(0056)
      .order("team_no", { nullsFirst: false })
      .order("name"),
  ]);

  const criteriaList = criteria ?? [];
  const criteriaCount = criteriaList.length;
  // 주민투표가 시작되면 상호평가 저장·재오픈이 잠긴다(lib/scoreLock).
  // 발표·참여도 점수는 「입장·참석 체크」 시트에서 매번 새로 읽는다(lib/attendanceSheet).
  const [locked, attendance] = await Promise.all([
    finalistsLocked(),
    fetchAttendanceScores(),
  ]);

  type TeamInfo = { name: string; team_no: number | null; status: string };
  const projectList = (projects ?? []).filter(
    (p) => (p.teams as unknown as TeamInfo | null)?.status !== "withdrawn"
  );
  const submittedCount = projectList.length;
  const submittedTeamIds = new Set(projectList.map((p) => p.team_id));
  const activeTeamIds = new Set((allTeams ?? []).map((t) => t.id as string));
  const activeProjectIds = new Set(projectList.map((p) => p.id as string));

  // 기권 팀이 준 점수, 기권 팀이 받은 점수는 결과에서 뺀다.
  const validScores = (teamScores ?? []).filter(
    (s) =>
      activeTeamIds.has(s.voter_team_id as string) &&
      activeProjectIds.has(s.project_id as string)
  );

  const teamDone = completedByVoter(validScores, "voter_team_id", criteriaCount);

  // ---------- 참여 팀 진행 현황 ----------
  // 평가 주체는 제출작이 아니라 팀 — 미제출 팀도 다른 팀을 평가하므로 전체 팀으로 행을 만든다.
  const teamRows = (allTeams ?? []).map((t) => {
    const target = teamVoteTarget(submittedCount, submittedTeamIds.has(t.id));
    const done = teamDone.get(t.id)?.size ?? 0;
    return {
      key: t.id,
      name: teamLabel(t.team_no, t.name || "이름 없음"),
      done: Math.min(done, target),
      total: target,
      complete: target > 0 && done >= target,
    };
  });
  const teamCompleteCount = teamRows.filter((r) => r.complete).length;

  // ---------- 상호평가 결과 ----------
  const maxById = new Map(
    criteriaList.map((c) => [c.id as string, c.max_score as number])
  );
  const totalMax = criteriaList.reduce((s, c) => s + (c.max_score as number), 0);
  type Agg = {
    voters: Set<string>;
    sum: number;
    maxSum: number;
    byCrit: Map<string, { sum: number; n: number }>;
  };
  const agg = new Map<string, Agg>();
  for (const s of validScores) {
    const cid = s.criteria_id as string;
    const max = maxById.get(cid);
    if (max === undefined) continue; // 본선 기준이 아닌 행은 집계하지 않는다
    const pid = s.project_id as string;
    let a = agg.get(pid);
    if (!a) {
      a = { voters: new Set(), sum: 0, maxSum: 0, byCrit: new Map() };
      agg.set(pid, a);
    }
    a.voters.add(s.voter_team_id as string);
    a.sum += s.score as number;
    a.maxSum += max;
    const c = a.byCrit.get(cid) ?? { sum: 0, n: 0 };
    c.sum += s.score as number;
    c.n += 1;
    a.byCrit.set(cid, c);
  }

  const results = projectList
    .map((p) => {
      const t = p.teams as unknown as TeamInfo | null;
      const a = agg.get(p.id as string);
      const voters = a?.voters.size ?? 0;
      const att =
        t?.team_no != null ? attendance.byTeamNo.get(t.team_no) : undefined;
      return {
        projectId: p.id as string,
        teamNo: t?.team_no ?? null,
        teamName: t?.name ?? "",
        label: teamLabel(t?.team_no ?? null, t?.name ?? ""),
        title: p.title as string,
        voters,
        critAvg: criteriaList.map((c) => {
          const v = a?.byCrit.get(c.id as string);
          return v && v.n > 0 ? v.sum / v.n : null;
        }),
        avg90: a && a.maxSum > 0 ? (a.sum / a.maxSum) * totalMax : null,
        score100: a && a.maxSum > 0 ? (a.sum / a.maxSum) * 100 : null,
        presentation: att?.presentation ?? null,
        participation: att?.participation ?? null,
        absent: att?.absent ?? null,
      };
    })
    .sort((x, y) => {
      if (x.score100 === null && y.score100 === null)
        return (x.teamNo ?? 999) - (y.teamNo ?? 999);
      if (x.score100 === null) return 1;
      if (y.score100 === null) return -1;
      if (y.score100 !== x.score100) return y.score100 - x.score100;
      return (x.teamNo ?? 999) - (y.teamNo ?? 999);
    });

  // 동점(소수 둘째 자리까지 같으면)은 같은 순위로 표시한다.
  let prevScore: number | null = null;
  let prevRank = 0;
  const ranked = results.map((r, i) => {
    let rank: number | null = null;
    if (r.score100 !== null) {
      const rounded = Math.round(r.score100 * 100) / 100;
      rank = prevScore !== null && rounded === prevScore ? prevRank : i + 1;
      prevScore = rounded;
      prevRank = rank;
    }
    return { ...r, rank };
  });

  const f1 = (n: number | null) =>
    n === null ? "" : (Math.round(n * 10) / 10).toFixed(1);
  const f2 = (n: number | null) =>
    n === null ? "" : (Math.round(n * 100) / 100).toFixed(2);

  // 종이 심사 점수와 엑셀에서 합산할 수 있게 CSV 로 내보낸다(엑셀 한글 깨짐 방지 BOM 포함).
  const csvEsc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csvHeader = [
    "순위",
    "조",
    "팀",
    "프로젝트",
    "평가한 팀 수",
    ...criteriaList.map((c) => `${c.name} 평균(${c.max_score}점)`),
    `평균(${totalMax}점 만점)`,
    "상호평가 점수(100점 환산)",
    "발표 점수(5점)",
    "참여도 점수(5점)",
    "참여도 감점(불참 횟수)",
  ];
  const csvRows = ranked.map((r) => [
    r.rank ?? "",
    r.teamNo ?? "",
    r.teamName,
    r.title,
    r.voters,
    ...r.critAvg.map((v) => f2(v)),
    f2(r.avg90),
    f2(r.score100),
    r.presentation ?? "",
    r.participation ?? "",
    r.absent ?? "",
  ]);
  const csv = [csvHeader, ...csvRows]
    .map((row) => row.map(csvEsc).join(","))
    .join("\r\n");
  const csvHref =
    "data:text/csv;charset=utf-8," + encodeURIComponent("\uFEFF" + csv);

  const evaluatedCount = ranked.filter((r) => r.voters > 0).length;

  return (
    <div className="mx-auto max-w-3xl lg:mx-0">
      {/* 평가가 진행되는 동안 화면을 띄워 두고 보므로 스스로 갱신한다. */}
      <AutoRefresh intervalMs={30000} />

      <AdminPageHeader
        title="팀 상호평가"
        desc="팀 상호평가를 열고 닫고, 결과와 진행 현황을 실시간으로 봅니다. 30초마다 자동 갱신됩니다."
        aside={
          <Link href="/vote" className="btn-ghost">
            팀 평가 화면 →
          </Link>
        }
      />

      {/* 팀 상호평가 ON/OFF (전시 주민투표는 /admin/audience) */}
      <div className="mt-6">
        <VotingControls votingOpen={settings?.voting_open ?? false} />
      </div>

      {locked && (
        <div className="mt-4 rounded-md border border-alert/30 bg-alert/[0.06] px-4 py-3 text-sm text-alert">
          🔒 전시 주민투표가 시작돼 팀 상호평가 저장과 다시 열기가 잠겨 있습니다.
          전시 도중에 진출팀이 바뀌지 않게 하기 위해서입니다.
        </div>
      )}

      {/* 상호평가 결과 */}
      <Section
        title="상호평가 결과"
        summaryRight={`평가 받은 팀 ${evaluatedCount}/${ranked.length}`}
        open
      >
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <p className="max-w-xl text-xs text-[var(--muted)]">
            팀장이 저장하는 즉시 반영됩니다. <b>점수(100)</b> = 받은 점수 합 ÷
            만점 합 × 100 (평가한 팀들의 평균을 100점으로 환산). 기권 팀이 준
            점수·받은 점수는 빠집니다. <b>발표·참여도</b>는{" "}
            <a
              href={ATTENDANCE_SHEET_URL}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-navy underline"
            >
              입장·참석 체크 시트
            </a>
            에서 그대로 가져옵니다(발표 시간 미입력 팀은 —).
          </p>
          <a
            href={csvHref}
            download="팀상호평가_결과.csv"
            className="btn-ghost flex-none"
          >
            CSV 다운로드
          </a>
        </div>
        {attendance.error && (
          <p className="mb-3 rounded-md border border-alert/30 bg-alert/[0.06] px-3 py-2 text-xs text-alert">
            발표·참여도 점수: {attendance.error}
          </p>
        )}
        {ranked.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="tbl min-w-[860px]">
              <thead>
                <tr>
                  <th>순위 / 팀</th>
                  <th className="!text-right">평가 수</th>
                  {criteriaList.map((c) => (
                    <th key={c.id as string} className="whitespace-nowrap !text-right">
                      {(c.name as string).split(" & ")[0]}
                      <span className="ml-0.5 font-normal text-[var(--muted)]">
                        ({c.max_score})
                      </span>
                    </th>
                  ))}
                  <th className="!text-right">평균({totalMax})</th>
                  <th className="!text-right">점수(100)</th>
                  <th className="!text-right">발표(5)</th>
                  <th className="!text-right">참여도(5)</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((r) => (
                  <tr key={r.projectId} className={r.voters === 0 ? "opacity-60" : ""}>
                    <td>
                      <span className="mr-2 inline-block w-5 text-right font-bold tabular-nums">
                        {r.rank ?? "—"}
                      </span>
                      <span className="whitespace-nowrap">{r.label}</span>
                      <span className="ml-2 text-xs text-[var(--muted)]">{r.title}</span>
                    </td>
                    <td className="num">{r.voters}</td>
                    {r.critAvg.map((v, i) => (
                      <td key={i} className="num">
                        {v === null ? "—" : f1(v)}
                      </td>
                    ))}
                    <td className="num">{r.avg90 === null ? "—" : f1(r.avg90)}</td>
                    <td className="num font-bold text-navy">
                      {r.score100 === null ? "—" : f2(r.score100)}
                    </td>
                    <td className="num">{r.presentation ?? "—"}</td>
                    <td className="num" title={r.absent !== null ? `불참 ${r.absent}회` : undefined}>
                      {r.participation ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">제출작이 없습니다.</p>
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
          <p className="text-sm text-[var(--muted)]">등록된 팀이 없습니다.</p>
        )}
      </Section>
    </div>
  );
}

// 접이식 섹션 (native <details>)
function Section({
  title,
  summaryRight,
  open = false,
  children,
}: {
  title: string;
  summaryRight?: string;
  open?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className="group card mt-4" open={open}>
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
