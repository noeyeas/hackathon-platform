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

  const { data: me } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = me?.role === "admin";
  if (me?.role !== "participant" && !isAdmin) {
    return (
      <Notice
        title="참가자 전용 페이지입니다"
        body="팀별 채점은 참가자만 할 수 있습니다. 심사위원은 심사 화면을 이용하세요."
      />
    );
  }

  const { data: membership } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const teamId = membership?.team_id ?? null;

  // 참가자는 팀 소속 필요, 운영자는 미리보기 허용
  if (!teamId && !isAdmin) {
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

  let projectsQuery = supabase
    .from("projects")
    .select("id, title, team_id, teams(name)")
    .order("submitted_at");
  if (teamId) projectsQuery = projectsQuery.neq("team_id", teamId); // 자기 팀 제외
  const { data: projects } = await projectsQuery;

  // 우리 팀이 이미 매긴 점수 (팀이 있을 때만)
  const { data: myScores } = teamId
    ? await supabase
        .from("team_scores")
        .select("project_id, criteria_id, score")
        .eq("voter_team_id", teamId)
    : { data: [] as { project_id: string; criteria_id: string; score: number }[] };

  const doneCount = new Set(myScores?.map((s) => s.project_id)).size;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">팀별 채점</h1>
      <p className="mt-1 text-[var(--muted)]">
        다른 팀({projects?.length ?? 0})을 심사 기준으로 채점해 주세요. 완료{" "}
        {doneCount}팀.
      </p>

      {isAdmin && !teamId && (
        <div className="mt-4 rounded-lg bg-admin/10 px-4 py-3 text-sm text-admin">
          운영자 미리보기입니다. 실제 채점 저장은 참가 팀만 할 수 있어요.
        </div>
      )}

      {!votingOpen && (
        <div className="mt-4 rounded-lg bg-vote/10 px-4 py-3 text-sm text-vote">
          현재는 평가가 닫혀 있습니다. 평가가 열리면 채점을 저장할 수 있어요.
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
