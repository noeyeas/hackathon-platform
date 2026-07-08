import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/ActionForm";
import { createRecruitPost } from "./actions";
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
    .select("id, title, body, positions, is_open, team_id, teams(name, invite_code, status)")
    .order("created_at", { ascending: false });

  const openPosts = posts?.filter((p) => p.is_open) ?? [];
  const myPosts = posts?.filter((p) => p.team_id === myTeamId) ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">팀원 모집</h1>
      <p className="mt-1 text-[var(--muted)]">
        함께할 팀원을 찾거나, 관심 있는 팀에 합류하세요.
      </p>

      {/* 내 팀 모집글 작성/관리 */}
      {user && myTeamId && (
        <div className="card mt-6">
          <h2 className="mb-3 font-bold">우리 팀 모집글 올리기</h2>
          <ActionForm
            action={createRecruitPost}
            submitLabel="모집글 등록"
            successMessage="모집글을 등록했습니다. 목록을 새로고침하세요."
          >
            <label className="label">제목 *</label>
            <input name="title" required className="input" placeholder="예: 프론트엔드 1명 구해요" />
            <label className="label mt-3">필요한 역할 (쉼표로 구분)</label>
            <input name="positions" className="input" placeholder="프론트엔드, 디자이너" />
            <label className="label mt-3">소개</label>
            <textarea name="body" rows={3} className="input" placeholder="어떤 프로젝트인지, 어떤 분을 찾는지" />
          </ActionForm>

          {myPosts.length > 0 && <RecruitManage posts={myPosts} />}
        </div>
      )}

      {user && !myTeamId && (
        <div className="card mt-6 flex items-center justify-between">
          <p className="text-sm text-[var(--muted)]">
            모집글을 올리려면 먼저 팀을 만들어야 해요.
          </p>
          <Link href="/team" className="btn-ghost">
            팀 만들기
          </Link>
        </div>
      )}

      {/* 공개 모집글 목록 */}
      <div className="mt-8 flex flex-col gap-3">
        <h2 className="font-bold">모집 중인 팀 ({openPosts.length})</h2>
        {openPosts.map((p) => {
          const team = p.teams as unknown as {
            name: string;
            invite_code: string;
            status: string;
          } | null;
          return (
            <div key={p.id} className="card">
              <div className="flex items-center justify-between">
                <span className="chip">{team?.name}</span>
                {team?.status === "locked" && (
                  <span className="text-xs text-[var(--muted)]">마감된 팀</span>
                )}
              </div>
              <h3 className="mt-2 font-bold">{p.title}</h3>
              {p.positions?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.positions.map((pos: string) => (
                    <span key={pos} className="chip border-team text-team">
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
              {team?.status !== "locked" && (
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
              )}
            </div>
          );
        })}
        {!openPosts.length && (
          <p className="card text-center text-[var(--muted)]">
            아직 모집 중인 팀이 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}
