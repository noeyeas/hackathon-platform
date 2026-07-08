import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ScoreCard } from "./ScoreCard";

export const dynamic = "force-dynamic";

export default async function JudgePage() {
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
  if (me?.role !== "judge") {
    return (
      <div className="card mx-auto max-w-md text-center">
        <h1 className="text-xl font-bold">심사위원 전용 페이지입니다</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          운영진에게 심사위원 권한을 요청하세요.
        </p>
      </div>
    );
  }

  const { data: criteria } = await supabase
    .from("criteria")
    .select("id, name, max_score")
    .order("sort");

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, teams(name)")
    .order("submitted_at");

  const { data: myScores } = await supabase
    .from("judge_scores")
    .select("project_id, criteria_id, score, comment")
    .eq("judge_id", user.id);

  const doneCount = new Set(myScores?.map((s) => s.project_id)).size;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">심사 채점</h1>
      <p className="mt-1 text-[var(--muted)]">
        모든 팀({projects?.length ?? 0})을 채점해 주세요. 채점 완료{" "}
        {doneCount}팀.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        {projects?.map((p) => {
          const team = (p.teams as unknown as { name: string } | null)?.name;
          const existing =
            myScores?.filter((s) => s.project_id === p.id) ?? [];
          return (
            <ScoreCard
              key={p.id}
              projectId={p.id}
              teamName={team ?? ""}
              title={p.title}
              criteria={criteria ?? []}
              existing={existing}
            />
          );
        })}
      </div>
    </div>
  );
}
