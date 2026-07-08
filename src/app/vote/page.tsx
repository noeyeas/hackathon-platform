import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { VoteList } from "./VoteList";

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
      <div className="card mx-auto max-w-md text-center">
        <h1 className="text-xl font-bold">로그인 후 투표할 수 있습니다</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          참가 팀 대표는 로그인 후 다른 팀에 투표할 수 있습니다.
        </p>
        <Link href="/login" className="btn-primary mt-4 inline-flex">
          로그인
        </Link>
      </div>
    );
  }

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, team_id, teams(name)")
    .order("submitted_at", { ascending: true });

  const { data: membership } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const list =
    projects
      ?.filter((p) => p.team_id !== membership?.team_id) // 자기 팀 제외
      .map((p) => ({
        id: p.id,
        title: p.title,
        team: (p.teams as unknown as { name: string } | null)?.name ?? "",
      })) ?? [];

  const { data: myVotes } = await supabase
    .from("votes")
    .select("project_id")
    .eq("voter_id", user.id);
  const votedIds = myVotes?.map((v) => v.project_id) ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">팀 상호 투표</h1>
      <p className="mt-1 text-[var(--muted)]">
        가장 인상 깊었던 다른 팀 1곳에 투표하세요. (팀 대표 1표)
      </p>

      {!votingOpen && (
        <div className="mt-4 rounded-lg bg-vote/10 px-4 py-3 text-sm text-vote">
          현재는 투표가 닫혀 있습니다. 투표가 열리면 이 화면에서 바로 참여할 수
          있어요.
        </div>
      )}

      <div className="mt-5">
        <VoteList
          projects={list}
          mode="team"
          votedIds={votedIds}
          disabled={!votingOpen}
        />
      </div>
    </div>
  );
}
