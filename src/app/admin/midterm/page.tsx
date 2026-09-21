import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { MID_CRITERIA, type MidRanking } from "@/lib/types";
import { MidControls } from "./MidControls";
import { PresentationInput } from "../scoring/PresentationInput";
import { completedByVoter } from "@/lib/scoring";
import { requireAdmin } from "@/lib/auth";
import { fetchAll } from "@/lib/fetchAll";
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
    admin.from("teams").select("id"),
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
          합계 100점. 발표 10점은 아래 집계표에서 운영진이 적고, 나머지 4항목
          (90점)은 심사위원이 채점합니다.
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
      </Section>

      <Section
        title="실시간 집계"
        summaryRight={`채점된 팀 ${scored.filter((r) => r.judge_count > 0).length}/${teamCount}`}
      >
        <p className="mb-3 text-xs text-[var(--muted)]">
          점수 = 심사위원 4항목(90점 환산) + <b>발표</b>(운영진 입력, 0~10점).
          1위가 매니패스트상 — 동점이면 팀 이름순으로 나오므로 운영진이
          확인해 정하세요.
        </p>
        {scored.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="tbl min-w-[520px]">
              <thead>
                <tr>
                  <th>순위 / 팀</th>
                  <th className="!text-right">발표</th>
                  <th className="!text-right">심사위원 수</th>
                  <th className="!text-right">점수</th>
                  <th>선정</th>
                </tr>
              </thead>
              <tbody>
                {scored.map((r, i) => (
                  <tr key={r.team_id} className={i === 0 ? "bg-gold-soft/40" : ""}>
                    <td>
                      <span className="mr-2 font-bold tabular-nums">{i + 1}</span>
                      {r.team_name}
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
