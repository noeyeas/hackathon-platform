import { createClient } from "@/lib/supabase/server";
import { RecruitModal } from "./RecruitModal";
import { MyRecruitButton } from "./MyRecruitButton";
import { RecruitTabs } from "./RecruitTabs";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  title: string;
  body: string | null;
  positions: string[] | null;
  is_open: boolean;
  kind: string;
  team_id: string | null;
  author_id: string | null;
  author_name: string | null;
  contact: string | null;
  teams: unknown;
};

export default async function RecruitPage() {
  const supabase = await createClient();

  // 모집글 목록은 로그인 여부와 무관 — 세션 확인과 병렬로 가져온다.
  const [
    {
      data: { user },
    },
    { data: posts },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("recruit_posts")
      .select(
        "id, title, body, positions, is_open, kind, team_id, author_id, author_name, contact, teams(name, status)"
      )
      .order("created_at", { ascending: false }),
  ]);

  let myTeamId: string | null = null;
  let isAdmin = false;
  if (user) {
    const [{ data }, { data: me }] = await Promise.all([
      supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase.from("users").select("role").eq("id", user.id).single(),
    ]);
    myTeamId = data?.team_id ?? null;
    isAdmin = me?.role === "admin";
  }

  const all = (posts ?? []) as Row[];

  const toPlain = (p: Row) => ({
    id: p.id,
    title: p.title,
    body: p.body,
    positions: p.positions,
    kind: p.kind,
    author_name: p.author_name,
    contact: p.contact,
    team:
      (p.teams as {
        name: string;
        status: string;
      } | null) ?? null,
  });

  const openPosts = all.filter((p) => p.is_open);
  const teamPosts = openPosts
    .filter((p) => p.kind !== "individual")
    .map(toPlain);
  const individualPosts = openPosts
    .filter((p) => p.kind === "individual")
    .map(toPlain);

  const myPosts = all
    .filter(
      (p) =>
        (user && p.author_id === user.id) ||
        (myTeamId && p.team_id === myTeamId)
    )
    .map((p) => ({
      id: p.id,
      title: p.title,
      is_open: p.is_open,
      kind: p.kind,
      positions: p.positions,
      body: p.body,
      contact: p.contact,
    }));

  return (
    <div className="mx-auto max-w-2xl">
      {/* 헤더 + 작성 버튼 */}
      <PageHeader
        eyebrow="Recruit"
        title="모집"
        desc="함께할 팀원을 찾거나, 관심 있는 팀에 합류하세요."
        aside={
          <>
            {myPosts.length > 0 && <MyRecruitButton posts={myPosts} />}
            <RecruitModal loggedIn={!!user} hasTeam={!!myTeamId} />
          </>
        }
      />

      {/* 팀원 구함 / 팀 구함 탭 전환 */}
      <RecruitTabs
        teamPosts={teamPosts}
        individualPosts={individualPosts}
        isAdmin={isAdmin}
      />
    </div>
  );
}
