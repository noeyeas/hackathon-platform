import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { PHASE_LABEL, type EventPhase } from "@/lib/types";
import { VoteList } from "./VoteList";

export const dynamic = "force-dynamic";

export default async function VotePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from("event_settings")
    .select("phase")
    .single();
  const phase = (settings?.phase ?? "signup") as EventPhase;

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, teams(name)")
    .order("submitted_at", { ascending: true });

  const list =
    projects?.map((p) => ({
      id: p.id,
      title: p.title,
      team: (p.teams as unknown as { name: string } | null)?.name ?? "",
    })) ?? [];

  // ---- 관객 QR 모드 ----
  if (token) {
    const admin = createAdminClient();
    const { data: tok } = await admin
      .from("audience_tokens")
      .select("id, label, votes_total, votes_used")
      .eq("token", token)
      .maybeSingle();

    if (!tok) {
      return (
        <Notice title="유효하지 않은 QR" body="운영진에게 문의해 주세요." />
      );
    }
    const { data: myVotes } = await admin
      .from("votes")
      .select("project_id")
      .eq("voter_id", tok.id);
    const votedIds = myVotes?.map((v) => v.project_id) ?? [];

    return (
      <VoteMode
        phase={phase}
        heading={`관객 투표 · ${tok.label ?? "QR"}`}
        subtitle={`남은 표 ${tok.votes_total - tok.votes_used} / ${tok.votes_total}`}
      >
        <VoteList
          projects={list}
          mode="audience"
          token={token}
          votedIds={votedIds}
          disabled={phase !== "voting" || tok.votes_used >= tok.votes_total}
        />
      </VoteMode>
    );
  }

  // ---- 팀 상호 투표 모드 (로그인) ----
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Notice
        title="투표하려면 QR을 스캔하거나 로그인하세요"
        body="현장 관객은 테이블의 QR 코드를, 참가 팀은 로그인 후 투표할 수 있습니다."
        cta
      />
    );
  }

  const { data: membership } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: myVotes } = await supabase
    .from("votes")
    .select("project_id")
    .eq("voter_id", user.id);
  const votedIds = myVotes?.map((v) => v.project_id) ?? [];

  // 자기 팀 작품은 목록에서 제외
  const filtered = membership
    ? await excludeOwnTeam(list, membership.team_id)
    : list;

  return (
    <VoteMode
      phase={phase}
      heading="팀 상호 투표"
      subtitle="가장 인상 깊었던 다른 팀 1곳에 투표하세요 (팀 대표 1표)"
    >
      <VoteList
        projects={filtered}
        mode="team"
        votedIds={votedIds}
        disabled={phase !== "voting"}
      />
    </VoteMode>
  );
}

async function excludeOwnTeam(
  list: { id: string; title: string; team: string }[],
  teamId: string
) {
  const supabase = await createClient();
  const { data: own } = await supabase
    .from("projects")
    .select("id")
    .eq("team_id", teamId)
    .maybeSingle();
  return list.filter((p) => p.id !== own?.id);
}

function VoteMode({
  phase,
  heading,
  subtitle,
  children,
}: {
  phase: EventPhase;
  heading: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-2xl">
      <span className="chip">{PHASE_LABEL[phase]}</span>
      <h1 className="mt-3 text-2xl font-bold">{heading}</h1>
      <p className="mt-1 text-[var(--muted)]">{subtitle}</p>
      {phase !== "voting" && (
        <div className="mt-4 rounded-lg bg-vote/10 px-4 py-3 text-sm text-vote">
          현재는 투표 기간이 아닙니다. 투표가 열리면 이 화면에서 바로 참여할 수
          있습니다.
        </div>
      )}
      <div className="mt-5">{children}</div>
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
