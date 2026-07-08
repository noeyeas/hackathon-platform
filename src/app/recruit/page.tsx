import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RecruitModal } from "./RecruitModal";
import { RecruitManage } from "./RecruitManage";

export const dynamic = "force-dynamic";

type Post = {
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

  let myTeamId: string | null = null;
  if (user) {
    const { data } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", user.id)
      .maybeSingle();
    myTeamId = data?.team_id ?? null;
  }

  const { data: posts } = await supabase
    .from("recruit_posts")
    .select(
      "id, title, body, positions, is_open, kind, team_id, author_id, author_name, contact, teams(name, invite_code, status)"
    )
    .order("created_at", { ascending: false });

  const all = (posts ?? []) as Post[];
  const openPosts = all.filter((p) => p.is_open);
  const teamPosts = openPosts.filter((p) => p.kind !== "individual");
  const individualPosts = openPosts.filter((p) => p.kind === "individual");
  const myPosts = all.filter(
    (p) =>
      (user && p.author_id === user.id) || (myTeamId && p.team_id === myTeamId)
  );

  return (
    <div className="mx-auto max-w-2xl">
      {/* 헤더 + 작성 버튼 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">팀원 모집</h1>
          <p className="mt-1 text-[var(--muted)]">
            함께할 팀원을 찾거나, 관심 있는 팀에 합류하세요.
          </p>
        </div>
        <RecruitModal loggedIn={!!user} hasTeam={!!myTeamId} />
      </div>

      {/* 팀원 구함 (팀 → 팀원) */}
      <Group
        title="🧑‍🤝‍🧑 팀원 구함"
        hint="팀이 함께할 팀원을 찾고 있어요"
        count={teamPosts.length}
        empty="팀원을 모집하는 팀이 아직 없습니다."
      >
        {teamPosts.map((p) => (
          <PostCard key={p.id} p={p} />
        ))}
      </Group>

      {/* 팀 구함 (개인 → 팀) */}
      <Group
        title="🙋 팀 구함"
        hint="아직 팀이 없는 분이 팀을 찾고 있어요"
        count={individualPosts.length}
        empty="팀을 구하는 개인이 아직 없습니다."
      >
        {individualPosts.map((p) => (
          <PostCard key={p.id} p={p} />
        ))}
      </Group>

      {/* 내 모집글 관리 */}
      {myPosts.length > 0 && (
        <div className="card mt-8">
          <h2 className="font-bold">내 모집글</h2>
          <RecruitManage posts={myPosts} />
        </div>
      )}
    </div>
  );
}

function Group({
  title,
  hint,
  count,
  empty,
  children,
}: {
  title: string;
  hint: string;
  count: number;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8 flex flex-col gap-3">
      <div>
        <h2 className="font-bold">
          {title} <span className="text-[var(--muted)]">({count})</span>
        </h2>
        <p className="text-sm text-[var(--muted)]">{hint}</p>
      </div>
      {count === 0 ? (
        <p className="card text-center text-sm text-[var(--muted)]">{empty}</p>
      ) : (
        children
      )}
    </section>
  );
}

function PostCard({ p }: { p: Post }) {
  const isTeam = p.kind !== "individual";
  const team = p.teams as {
    name: string;
    invite_code: string;
    status: string;
  } | null;

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`chip ${
              isTeam ? "border-team text-team" : "border-admin text-admin"
            }`}
          >
            {isTeam ? "팀원 구함" : "팀 구함"}
          </span>
          <span className="text-sm font-semibold">
            {isTeam ? team?.name : (p.author_name ?? "익명")}
          </span>
        </div>
        {isTeam && team?.status === "locked" && (
          <span className="text-xs text-[var(--muted)]">마감된 팀</span>
        )}
      </div>

      <h3 className="mt-2 font-bold">{p.title}</h3>

      {p.positions && p.positions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {p.positions.map((pos: string) => (
            <span key={pos} className="chip">
              {pos}
            </span>
          ))}
        </div>
      )}

      {p.body && (
        <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--muted)]">
          {p.body}
        </p>
      )}

      {isTeam
        ? team?.status !== "locked" && (
            <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm">
              합류하려면{" "}
              <Link href="/team" className="font-semibold text-vote underline">
                팀 페이지
              </Link>
              에서 초대 코드{" "}
              <span className="select-all font-mono font-bold">
                {team?.invite_code}
              </span>{" "}
              입력
            </div>
          )
        : p.contact && (
            <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm">
              연락:{" "}
              <span className="select-all font-semibold text-admin">
                {p.contact}
              </span>
            </div>
          )}
    </div>
  );
}
