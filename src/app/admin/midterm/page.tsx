import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { MID_CRITERIA, type MidRanking } from "@/lib/types";
import { MidControls } from "./MidControls";
import { PresentationInput } from "../scoring/PresentationInput";
import { JudgePaperInput } from "../scoring/JudgePaperInput";
import { completedByVoter } from "@/lib/scoring";
import { requireAdmin } from "@/lib/auth";
import { fetchAll } from "@/lib/fetchAll";
import { teamLabel } from "@/lib/format";
import { AdminPageHeader } from "../AdminPageHeader";

export const dynamic = "force-dynamic";

// 중간발표(9.28) 심사 운영 — 스위치 · 심사위원 진행 현황 · 집계(매니패스트상).
// 본선(/admin/scoring)과 화면을 나눈 이유: 날짜도 심사표도 저장소도 다르다(0053).
export default async function MidtermPage() {
  // 레이아웃의 검사는 이 페이지의 렌더를 막지 못한다(병렬 렌더). 서비스 롤로
  // 조회하기 전에 여기서 직접 확인한다 — 점수가 걸려 있다.
  if (!(await requireAdmin())) return null;

  const admin = createAdminClient();
  const [
    { data: settings },
    { data: criteria },
    { data: teams },
    { data: judges },
    { data: midScores },
    { data: rankings },
  ] = await Promise.all([
    admin.from("event_settings").select("mid_judging_open").single(),
    admin.from("criteria").select("id").eq("round", "mid"),
    admin.from("teams").select("id").neq("status", "withdrawn"), // 기권 제외(0056)
    admin.from("users").select("id, name, email").eq("role", "judge").order("name"),
    // 40팀 × 5기준 × 심사위원 수 — 1,000행을 넘길 수 있어 끝까지 읽는다.
    fetchAll(() =>
      admin.from("mid_scores").select("judge_id, team_id, criteria_id")
    ),
    admin.from("mid_rankings").select("*").returns<MidRanking[]>(),
  ]);

  const criteriaCount = criteria?.length ?? 0;
  const teamCount = teams?.length ?? 0;

  // completedByVoter 는 project_id 키를 보므로 team_id 를 그 자리에 넣는다.
  const judgeDone = completedByVoter(
    (midScores ?? []).map((s) => ({
      judge_id: s.judge_id,
      project_id: s.team_id,
      criteria_id: s.criteria_id,
    })),
    "judge_id",
    criteriaCount
  );
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
  const judgeComplete = judgeRows.filter((r) => r.complete).length;
  // 발표 점수를 넣어야 하므로 전 팀을 보여 준다. 채점 전 팀은 발표 점수만 있다.
  const scored = rankings ?? [];

  return (
    <div className="mx-auto max-w-2xl lg:mx-0">
      <AdminPageHeader
        title="중간발표 심사"
        desc="9.28 예선(중간발표) 채점을 열고 닫고, 집계로 매니패스트상 1팀을 정합니다. 본선 점수에는 반영되지 않습니다."
        aside={
          <Link href="/judge/mid" className="btn-primary">
            중간발표 채점 화면 →
          </Link>
        }
      />

      <div className="mt-6">
        <MidControls open={settings?.mid_judging_open ?? false} />
      </div>

      <div className="card mt-4">
        <h2 className="font-bold">중간발표 심사 기준</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          합계 100점. 심사위원은 종이 채점표로 4항목(90점)을 매기고, 운영진이
          팀별 평균을 아래 집계표의 <b>심사</b> 칸에 적습니다. 발표 10점도 운영진이
          적습니다.
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {MID_CRITERIA.map((c) => (
            <li key={c.t} className="chip">
              {c.t} <b className="ml-1 text-navy">{c.p}</b>
            </li>
          ))}
        </ul>
      </div>

      <Section
        title="심사위원 진행 현황"
        summaryRight={`완료 ${judgeComplete}/${judgeRows.length}명`}
      >
        <p className="mb-3 text-xs text-[var(--muted)]">
          웹 채점 화면(/judge/mid)을 쓴 심사위원의 진행 상황입니다. 종이로
          채점하면 여기는 비어 있어도 됩니다 — 집계는 아래 심사 칸을 봅니다.
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

      <Section
        title="실시간 집계"
        summaryRight={`심사 입력 ${scored.filter((r) => r.judge_paper_score !== null || r.judge_count > 0).length}/${teamCount}`}
      >
        <p className="mb-3 text-xs text-[var(--muted)]">
          점수 = <b>심사</b>(종이 채점표 팀별 평균, 0~90, 비우면 웹 채점 환산) +
          <b>발표</b>(0~10점). 둘 다 운영진이 적습니다 — 숫자를 바꾸고 Enter 또는 저장.
          1위가 매니패스트상 — 동점이면 조 번호순으로 나오므로 운영진이
          확인해 정하세요.
        </p>
        {scored.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="tbl min-w-[600px]">
              <thead>
                <tr>
                  <th>순위 / 팀</th>
                  <th className="!text-right">심사 (0~90)</th>
                  <th className="!text-right">발표 (0~10)</th>
                  <th className="!text-right">웹 채점</th>
                  <th className="!text-right">점수</th>
                  <th>선정</th>
                </tr>
              </thead>
              <tbody>
                {scored.map((r, i) => (
                  <tr key={r.team_id} className={i === 0 ? "bg-gold-soft/40" : ""}>
                    <td>
                      <span className="mr-2 font-bold tabular-nums">{i + 1}</span>
                      {teamLabel(r.team_no, r.team_name)}
                    </td>
                    <td className="num">
                      <JudgePaperInput
                        teamId={r.team_id}
                        round="mid"
                        initial={r.judge_paper_score}
                      />
                    </td>
                    <td className="num">
                      <PresentationInput
                        teamId={r.team_id}
                        round="mid"
                        initial={r.presentation_score}
                      />
                    </td>
                    <td className="num">{r.judge_count}</td>
                    <td className="num font-bold text-navy">{r.judge_score}</td>
                    <td>
                      {i === 0 ? (
                        <span className="badge-gold">매니패스트상</span>
                      ) : (
                        <span className="text-xs text-[var(--muted)]">—</span>
                      )}
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
      </Section>
    </div>
  );
}

// 접이식 섹션 — /admin/scoring 과 같은 모양.
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
    <details className="group card mt-4" open>
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
          className={`h-full rounded-full ${complete ? "bg-team" : "bg-navy"}`}
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
