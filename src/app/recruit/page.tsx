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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // contact 는 로그인 사용자에게만 컬럼 권한이 있다(0036). 비로그인 상태에서
  // 요청하면 목록 전체가 권한 오류로 비므로, 세션을 먼저 확인하고 조회 컬럼을
  // 골라야 한다(그래서 위 getUser 와 병렬로 묶지 않는다).
  const columns = [
    "id, title, body, positions, is_open, kind, team_id, author_id, author_name",
    user ? "contact" : null,
    "teams(name, status)",
  ]
    .filter(Boolean)
    .join(", ");

  const { data: posts } = await supabase
    .from("recruit_posts")
    .select(columns)
    .order("created_at", { ascending: false });

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

  // 조회 컬럼을 실행 중에 조립하므로 supabase-js 가 행 타입을 추론하지 못한다.
  const all = (posts ?? []) as unknown as Row[];

  // 연락처(카톡 ID·전화번호 등)는 로그인한 사람에게만 내려보낸다.
  // 서버 컴포넌트가 넘긴 값은 RSC 페이로드에 그대로 실려 브라우저에서
  // 읽히므로, "화면에 안 그린다"로는 가려지지 않는다. 아예 빼야 한다.
  const toPlain = (p: Row) => ({
    id: p.id,
    title: p.title,
    body: p.body,
    positions: p.positions,
    kind: p.kind,
    author_name: p.author_name,
    contact: user ? p.contact : null,
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
        loggedIn={!!user}
      />
    </div>
  );
}
