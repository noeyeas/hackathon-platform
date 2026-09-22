import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ScoreCard } from "../ScoreCard";
import { saveMidScores } from "../actions";
import { ScoreProgress } from "@/components/ScoreProgress";
import { completedCount } from "@/lib/scoring";
import { PageHeader } from "@/components/PageHeader";
import { JudgeTabs } from "../JudgeTabs";
import { teamLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

// 중간발표(9.28) 채점 화면. 본선(/judge)과 같은 카드 UI 를 쓰되 대상이
// 제출물이 아니라 팀이다 — 9.28 에는 제출물이 없는 팀이 대부분이다(0053).
export default async function MidJudgePage() {
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
  if (me?.role !== "judge" && me?.role !== "admin") {
    return (
      <div className="card mx-auto max-w-md text-center">
        <h1 className="display text-xl">심사위원 전용 페이지입니다</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          심사위원으로 등록된 이메일로 로그인했는지 확인해 주세요. 다른 계정으로
          로그인했다면 로그아웃 후 등록된 계정으로 다시 로그인하면 됩니다.
        </p>
      </div>
    );
  }

  const [{ data: settings }, { data: criteria }, { data: teams }, { data: myScores }] =
    await Promise.all([
      supabase.from("event_settings").select("mid_judging_open").single(),
      supabase
        .from("criteria")
        .select("id, name, max_score, weight, description")
        .eq("round", "mid")
        .order("sort"),
      // 기권 팀은 채점 대상이 아니다(0056)
      supabase
        .from("teams")
        .select("id, name, team_no, tagline")
        .neq("status", "withdrawn")
        .order("team_no", { nullsFirst: false }) // 발표 순서 = 조 번호순(0058)
        .order("name"),
      supabase
        .from("mid_scores")
        .select("team_id, criteria_id, score, comment")
        .eq("judge_id", user.id),
    ]);
  const open = settings?.mid_judging_open ?? false;

  // 완료 = 모든 기준을 채운 팀만. 운영 화면과 같은 규칙(scoring.ts).
  const doneCount = completedCount(
    (myScores ?? []).map((s) => ({ project_id: s.team_id, criteria_id: s.criteria_id })),
    criteria?.length ?? 0
  );

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Judging"
        title="중간발표 심사 채점"
        desc="9.28 중간발표 — 모든 팀을 중간발표 심사 기준 4항목(90점)으로 채점해 주세요. 발표 10점은 운영진이 반영하며, 합산 1위 팀이 매니패스트상을 받습니다."
      />

      <JudgeTabs active="mid" />

      <ScoreProgress done={doneCount} total={teams?.length ?? 0} />

      {!open && (
        <div className="mt-4 rounded-md border border-gold/30 bg-gold-soft px-4 py-3 text-sm text-gold-ink">
          현재는 중간발표 채점이 닫혀 있습니다. 운영진이 열면 점수를 저장할 수
          있어요.
        </div>
      )}

      <div className="mt-6 flex flex-col gap-4">
        {teams?.map((t) => {
          const existing = (myScores ?? []).filter((s) => s.team_id === t.id);
          return (
            <ScoreCard
              key={t.id}
              projectId={t.id}
              // 제출물이 없으니 팀 이름이 제목, 한 줄 소개가 부제다
              teamName={t.tagline ?? ""}
              title={teamLabel(t.team_no, t.name)}
              criteria={criteria ?? []}
              existing={existing}
              action={saveMidScores}
            />
          );
        })}
      </div>
    </div>
  );
}
