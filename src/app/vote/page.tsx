import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ScoreCard } from "../judge/ScoreCard";
import { saveTeamScores } from "./actions";

export const dynamic = "force-dynamic";

export default async function VotePage() {
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from("event_settings")
    .select("voting_open")
    .single();
  const votingOpen = settings?.voting_open ?? false;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Notice
        title="로그인 후 채점할 수 있습니다"
        body="참가 팀만 다른 팀을 채점할 수 있습니다."
        cta
      />
    );
  }

  const { data: membership } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return (
      <Notice
        title="먼저 팀에 소속되어야 합니다"
        body="팀을 만들거나 초대 코드로 합류한 뒤 다른 팀을 채점할 수 있어요."
      />
    );
  }

  const { data: criteria } = await supabase
    .from("criteria")
    .select("id, name, max_score, weight, description")
    .order("sort");

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, team_id, teams(name)")
    .neq("team_id", membership.team_id) // 자기 팀 제외
    .order("submitted_at");

  // 우리 팀이 이미 매긴 점수
  const { data: myScores } = await supabase
    .from("team_scores")
    .select("project_id, criteria_id, score")
    .eq("voter_team_id", membership.team_id);

  const doneCount = new Set(myScores?.map((s) => s.project_id)).size;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">팀별 채점</h1>
      <p className="mt-1 text-[var(--muted)]">
        다른 팀({projects?.length ?? 0})을 심사 기준으로 채점해 주세요. 완료{" "}
        {doneCount}팀.
      </p>

      {!votingOpen && (
        <div className="mt-4 rounded-lg bg-vote/10 px-4 py-3 text-sm text-vote">
          현재는 투표가 닫혀 있습니다. 투표가 열리면 채점을 저장할 수 있어요.
        </div>
      )}

      <div className="mt-6 flex flex-col gap-4">
        {projects?.map((p) => {
          const team = (p.teams as unknown as { name: string } | null)?.name;
          const existing =
            myScores
              ?.filter((s) => s.project_id === p.id)
              .map((s) => ({
                criteria_id: s.criteria_id,
                score: s.score,
                comment: null,
              })) ?? [];
          return (
            <ScoreCard
              key={p.id}
              projectId={p.id}
              teamName={team ?? ""}
              title={p.title}
              criteria={criteria ?? []}
              existing={existing}
              action={saveTeamScores}
              withComment={false}
            />
          );
        })}
        {!projects?.length && (
          <p className="card text-center text-[var(--muted)]">
            채점할 다른 팀이 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}

function Notice({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta?: boolean;
}) {
  return (
    <div className="card mx-auto max-w-md text-center">
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">{body}</p>
      {cta && (
        <Link href="/login" className="btn-primary mt-4 inline-flex">
          로그인
        </Link>
      )}
    </div>
  );
}
