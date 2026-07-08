import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RecruitModal } from "./RecruitModal";
import { RecruitManage } from "./RecruitManage";

export const dynamic = "force-dynamic";

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

  const openPosts = posts?.filter((p) => p.is_open) ?? [];
  const myPosts =
    posts?.filter(
      (p) =>
        (user && p.author_id === user.id) ||
        (myTeamId && p.team_id === myTeamId)
    ) ?? [];

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

      {/* 팀 / 개인 목록 (최상단) */}
      <div className="mt-6 flex flex-col gap-3">
        <h2 className="font-bold">팀 / 개인 ({openPosts.length})</h2>
        {openPosts.map((p) => {
          const team = p.teams as unknown as {
            name: string;
            invite_code: string;
            status: string;
          } | null;
          const isTeam = p.kind !== "individual";
          return (
            <div key={p.id} className="card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`chip ${
                      isTeam
                        ? "border-team text-team"
                        : "border-admin text-admin"
                    }`}
                  >
                    {isTeam ? "팀" : "개인"}
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

              {p.positions?.length > 0 && (
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

              {/* 합류/연락 안내 */}
              {isTeam ? (
                team?.status !== "locked" && (
                  <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm">
                    합류하려면{" "}
                    <Link
                      href="/team"
                      className="font-semibold text-vote underline"
                    >
                      팀 페이지
                    </Link>
                    에서 초대 코드{" "}
                    <span className="select-all font-mono font-bold">
                      {team?.invite_code}
                    </span>{" "}
                    입력
                  </div>
                )
              ) : (
                p.contact && (
                  <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm">
                    연락:{" "}
                    <span className="select-all font-semibold text-admin">
                      {p.contact}
                    </span>
                  </div>
                )
              )}
            </div>
          );
        })}
        {!openPosts.length && (
          <p className="card text-center text-[var(--muted)]">
            아직 모집글이 없습니다. 첫 글을 올려보세요.
          </p>
        )}
      </div>

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
