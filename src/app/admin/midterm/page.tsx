import { createAdminClient } from "@/lib/supabase/server";
import { MID_CRITERIA } from "@/lib/types";
import { JudgeSheetGrid } from "../scoring/JudgeSheetGrid";
import { requireAdmin } from "@/lib/auth";
import { fetchAll } from "@/lib/fetchAll";
import { teamLabel } from "@/lib/format";
import { AdminPageHeader } from "../AdminPageHeader";

export const dynamic = "force-dynamic";

// 중간발표(9.28) 심사 운영 — 회수한 종이 채점표를 옮겨 적으면 평균·점수·순위가
// 바로 나온다(0059). 심사위원은 웹에 로그인하지 않는다.
// 본선(/admin/scoring)과 화면을 나눈 이유: 날짜도 심사표도 발표 배점도 다르다.
export default async function MidtermPage() {
  // 레이아웃의 검사는 이 페이지의 렌더를 막지 못한다(병렬 렌더). 서비스 롤로
  // 조회하기 전에 여기서 직접 확인한다 — 점수가 걸려 있다.
  if (!(await requireAdmin())) return null;

  const admin = createAdminClient();
  const [{ data: teams }, { data: judges }, { data: sheets }] = await Promise.all([
    admin
      .from("teams")
      .select("id, name, team_no, mid_presentation_score")
      .neq("status", "withdrawn") // 기권 제외(0056)
      // 채점표와 같은 순서로 적어야 눈이 덜 흔들린다 — 조 번호순(0058).
      .order("team_no", { nullsFirst: false })
      .order("name"),
    // 심사위원 명부 = judge_emails(0055). 로그인과 무관한 목록이어야 한다.
    admin.from("judge_emails").select("email, name").order("created_at"),
    // 40팀 × 심사위원 수. 1,000행을 넘길 수 있어 끝까지 읽는다.
    fetchAll(() =>
      admin
        .from("judge_sheets")
        .select("team_id, judge_email, score")
        .eq("round", "mid")
    ),
  ]);

  const rows = (teams ?? []).map((t) => ({
    teamId: t.id,
    label: teamLabel(t.team_no, t.name || "이름 없음"),
    presentation: t.mid_presentation_score ?? 0,
    absent: 0, // 참여도 감점은 본선에만 있다(0052)
  }));
  const judgeList = (judges ?? []).map((j) => ({
    email: j.email,
    name: j.name || j.email,
  }));

  return (
    <div className="mx-auto max-w-2xl lg:mx-0">
      <AdminPageHeader
        title="중간발표 심사"
        desc="9.28 중간발표 — 회수한 종이 채점표를 옮겨 적으면 평균·점수·순위가 바로 계산됩니다. 1위가 매니패스트상이며 본선 점수에는 반영되지 않습니다."
      />

      <div className="card mt-6">
        <h2 className="font-bold">중간발표 심사 기준</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          합계 100점. 심사위원은 종이 채점표로 4항목(90점)을 매기고, 운영진이
          아래 표에 <b>심사위원별 합계</b>를 옮겨 적습니다 — 팀 점수는 입력된
          채점표 장수만큼 평균한 값입니다. 발표 10점은 운영진이 적습니다.
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {MID_CRITERIA.map((c) => (
            <li key={c.t} className="chip">
              {c.t} <b className="ml-1 text-navy">{c.p}</b>
            </li>
          ))}
        </ul>
      </div>

      <div className="card mt-4">
        <h2 className="font-bold">종이 채점표 입력 · 집계</h2>
        <p className="mb-3 mt-1 text-xs text-[var(--muted)]">
          심사위원 칸에 그 심사위원 채점표의 <b>4항목 합계(0~90)</b>를 적습니다.
          채점하지 않은 칸은 비워 두세요 — 평균에서 빠집니다(2명만 오면 2장
          평균). 점수 = 평균 + 발표. 동점이면 조 번호순으로 나오므로 1위는
          운영진이 표를 보고 확인해 정하세요.
        </p>
        {rows.length > 0 && judgeList.length > 0 ? (
          <JudgeSheetGrid
            round="mid"
            judges={judgeList}
            rows={rows}
            cells={sheets ?? []}
            showRank
            rankBadge="매니패스트상"
          />
        ) : (
          <p className="text-sm text-[var(--muted)]">
            {judgeList.length === 0
              ? "심사위원 명부(judge_emails)가 비어 있습니다."
              : "등록된 팀이 없습니다."}
          </p>
        )}
      </div>
    </div>
  );
}
