import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ensureLeaderMembership } from "@/lib/linkLeader";
import { ScoreCard } from "./ScoreCard";
import { saveTeamScores } from "./actions";
import { ScoreProgress } from "@/components/ScoreProgress";
import { completedCount } from "@/lib/scoring";
import { PageHeader } from "@/components/PageHeader";
import { byTeamNo, teamLabel } from "@/lib/format";

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

  // 팀장 이메일로 등록된 팀에 자동 연결
  await ensureLeaderMembership(user.id, user.email);

  const { data: membership } = await supabase
    .from("team_members")
    .select("team_id, is_leader")
    .eq("user_id", user.id)
    .maybeSingle();
  const teamId = membership?.team_id ?? null;
  const isLeader = membership?.is_leader ?? false;

  // 참가자는 팀 소속 필요, 운영자는 미리보기 허용
  if (!teamId && !isAdmin) {
    return (
      <Notice
        title="먼저 팀에 소속되어야 합니다"
        body="신청 폼에 적은 팀장 이메일로 로그인하면 팀이 연결되고, 그 뒤 다른 팀을 채점할 수 있어요."
      />
    );
  }

  // 기권 팀은 평가 주체도 아니다(0056) — 저장은 서버 액션이 막지만, 화면에서도
  // 채점 카드를 띄우지 않아야 팀장이 헛수고를 하지 않는다.
  if (teamId && !isAdmin) {
    const { data: myTeam } = await supabase
      .from("teams")
      .select("status")
      .eq("id", teamId)
      .single();
    if (myTeam?.status === "withdrawn") {
      return (
        <Notice
          title="기권한 팀은 평가할 수 없습니다"
          body="기권 처리된 팀은 다른 팀 평가에 참여하지 않습니다. 문의는 운영진에게 해 주세요."
        />
      );
    }
  }

  // 팀 평가는 팀장만 (팀원은 안내만) — 운영자 미리보기는 허용
  if (teamId && !isLeader && !isAdmin) {
    return (
      <Notice
        title="팀 평가는 팀장이 진행합니다"
        body="한 팀당 한 번만 반영되도록, 다른 팀 평가는 팀장이 대표로 제출합니다."
      />
    );
  }

  const { data: criteria } = await supabase
    .from("criteria")
    .select("id, name, max_score, weight, description")
    .eq("round", "final") // 팀 상호평가는 본선 심사표만 쓴다(0053)
    .order("sort");

  let projectsQuery = supabase
    .from("projects")
    .select("id, title, team_id, present_order, teams(name, team_no, status)")
    .order("submitted_at");
  if (teamId) projectsQuery = projectsQuery.neq("team_id", teamId); // 자기 팀 제외
  const { data: allProjects } = await projectsQuery;
  // 기권 팀의 제출물은 평가 대상이 아니다(0056)
  const projects = (allProjects ?? [])
    .filter(
      (p) => (p.teams as unknown as { status: string } | null)?.status !== "withdrawn"
    )
    // 발표 순서(projects.present_order)대로 — 팀장이 발표를 들으며 바로 다음
    // 카드를 채점할 수 있게 한다. 최종발표 순서는 조 번호순과 다르다(10.9 확정
    // 순서를 운영진이 DB 에 넣는다). 순번이 비어 있는 제출물은 뒤로 보내고,
    // 그 안에서는 조 번호순(0058).
    .sort((a, b) => {
      const ao = (a.present_order as number | null) ?? Number.MAX_SAFE_INTEGER;
      const bo = (b.present_order as number | null) ?? Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
      return byTeamNo(
        (a.teams as unknown as { team_no: number | null; name: string }) ?? {},
        (b.teams as unknown as { team_no: number | null; name: string }) ?? {}
      );
    });

  // 우리 팀이 이미 매긴 점수 (팀이 있을 때만)
  // team_scores 는 RLS 상 운영자만 읽을 수 있어(0013) 참가자 세션으로 읽으면
  // 항상 빈 배열 → 새로고침마다 "미채점"·진행률 0 으로 보였다. teamId 는 위에서
  // 본인 소속으로 확인한 값이므로 서버에서 Service Role 로 우리 팀 행만 읽는다.
  const { data: myScores } = teamId
    ? await createAdminClient()
        .from("team_scores")
        .select("project_id, criteria_id, score")
        .eq("voter_team_id", teamId)
    : { data: [] as { project_id: string; criteria_id: string; score: number }[] };

  // 완료 = 모든 기준을 채운 대상만. 운영 대시보드와 같은 규칙을 쓴다.
  const doneCount = completedCount(myScores, criteria?.length ?? 0);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Peer review"
        title="팀별 채점"
        desc="자기 팀을 제외한 다른 팀을 심사 기준으로 채점해 주세요."
      />

      {teamId && <ScoreProgress done={doneCount} total={projects?.length ?? 0} />}

      {isAdmin && !teamId && (
        <div className="mt-4 rounded-md border border-admin/20 bg-admin/[0.06] px-4 py-3 text-sm text-admin">
          운영자 미리보기입니다. 실제 채점 저장은 참가 팀만 할 수 있어요.
        </div>
      )}

      {!votingOpen && (
        <div className="mt-4 rounded-md border border-gold/30 bg-gold-soft px-4 py-3 text-sm text-gold-ink">
          현재는 평가가 닫혀 있습니다. 평가가 열리면 채점을 저장할 수 있어요.
        </div>
      )}

      <div className="mt-6 flex flex-col gap-4">
        {projects?.map((p) => {
          const t = p.teams as unknown as { name: string; team_no: number | null } | null;
          const team = t ? teamLabel(t.team_no, t.name) : "";
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
              order={(p.present_order as number | null) ?? null}
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
      <h1 className="display text-xl">{title}</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">{body}</p>
      {cta && (
        <Link href="/login" className="btn-primary mt-4 inline-flex">
          로그인
        </Link>
      )}
    </div>
  );
}
