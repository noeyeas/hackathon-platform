import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/ActionForm";
import { joinTeam } from "../team/actions";
import { EditableField } from "../team/EditableField";
import { ProjectForm } from "../submit/ProjectForm";
import { TeamName } from "@/components/TeamName";
import { canEditTeam } from "@/lib/teamEdit";
import { formatDateTime } from "@/lib/format";
import { NewCommentsBadge } from "./NewCommentsBadge";

export const dynamic = "force-dynamic";

export default async function MyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="card mx-auto max-w-md text-center">
        <h1 className="text-xl font-bold">로그인이 필요합니다</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          마이페이지는 로그인 후 이용할 수 있습니다.
        </p>
        <Link href="/login" className="btn-primary mt-4 inline-flex">
          로그인 / 가입
        </Link>
      </div>
    );
  }

  const { data: me } = await supabase
    .from("users")
    .select("name, email, role")
    .eq("id", user.id)
    .single();

  const { data: membership } = await supabase
    .from("team_members")
    .select("team_id, is_leader")
    .eq("user_id", user.id)
    .maybeSingle();

  const isLeader = membership?.is_leader ?? false;

  const { data: team } = membership
    ? await supabase
        .from("teams")
        .select("name, tagline, members_note, status")
        .eq("id", membership.team_id)
        .single()
    : { data: null };

  const { data: project } = membership
    ? await supabase
        .from("projects")
        .select(
          "id, title, description, repo_url, demo_url, video_url, deck_url, view_count"
        )
        .eq("team_id", membership.team_id)
        .maybeSingle()
    : { data: null };

  // 내 작품 반응 (조회·좋아요·댓글)
  let likeCount = 0;
  let commentCount = 0;
  let comments: {
    id: string;
    body: string;
    created_at: string;
    users: unknown;
  }[] = [];
  if (project) {
    const [{ count: lc }, { count: cc }, { data: cs }] = await Promise.all([
      supabase
        .from("project_likes")
        .select("id", { count: "exact", head: true })
        .eq("project_id", project.id),
      supabase
        .from("project_comments")
        .select("id", { count: "exact", head: true })
        .eq("project_id", project.id),
      supabase
        .from("project_comments")
        .select("id, body, created_at, users(name)")
        .eq("project_id", project.id)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);
    likeCount = lc ?? 0;
    commentCount = cc ?? 0;
    comments = cs ?? [];
  }
  const latestCommentAt = comments[0]?.created_at ?? null;

  const canEdit = isLeader && canEditTeam();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">마이페이지</h1>
          <p className="mt-1 text-[var(--muted)]">
            {me?.name ?? me?.email}님, 환영합니다.
          </p>
        </div>
        {membership && (
          <div className="flex flex-wrap gap-2">
            {isLeader && (
              <Link href="/vote" className="btn-ghost">
                다른 팀 평가하기
              </Link>
            )}
            {project && (
              <Link href={`/gallery/${project.id}`} className="btn-primary">
                내 프로젝트 갤러리 보러가기
              </Link>
            )}
          </div>
        )}
      </div>

      {/* 팀 미소속 — 팀장 코드로 합류 */}
      {!membership && (
        <div className="card mx-auto w-full max-w-md">
          <h2 className="text-lg font-bold">팀장 코드로 합류</h2>
          <p className="mb-4 mt-1 text-sm text-[var(--muted)]">
            팀은 운영진이 선정·등록합니다. 팀을 대표하는 <b>팀장</b>이 운영진에게
            받은 <b>팀장 코드</b>로 합류해 팀 정보를 관리하고 프로젝트를
            제출합니다.
          </p>
          <ActionForm action={joinTeam} submitLabel="팀 합류">
            <label className="label">팀장 코드</label>
            <input
              name="leader_code"
              required
              className="input font-mono"
              placeholder="a1b2c3d4"
            />
          </ActionForm>
        </div>
      )}

      {membership && (
        <div className="grid items-start gap-5 lg:grid-cols-2">
          {/* 왼쪽: 내 팀(위) + 팀 작품 반응(아래) */}
          <div className="flex flex-col gap-5">
            {/* 내 팀 */}
            <section className="card">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  내 팀
                </h2>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <TeamName
                  name={team?.name ?? ""}
                  membersNote={team?.members_note}
                  chipClassName="text-lg font-bold"
                />
                {isLeader && (
                  <span className="chip border-team text-team">팀장</span>
                )}
              </div>

              <div className="mt-4 flex flex-col gap-4 border-t border-[var(--line)] pt-4">
                <EditableField
                  label="한 줄 소개"
                  field="tagline"
                  value={team?.tagline ?? null}
                  editable={canEdit}
                  placeholder="우리 팀을 소개해 주세요"
                />
                <EditableField
                  label="팀원 구성"
                  field="members_note"
                  value={team?.members_note ?? null}
                  editable={canEdit}
                  multiline
                  placeholder="예: 김철수(기획), 이영희(프론트), 박민수(백엔드)"
                />
                {isLeader && !canEdit && (
                  <p className="text-xs text-[var(--muted)]">
                    수정 기간이 종료되어 팀 정보를 변경할 수 없습니다.
                  </p>
                )}
              </div>
            </section>

            {/* 팀 작품 반응 */}
            {project && (
              <section className="card">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    팀 작품 반응
                  </h2>
                  <NewCommentsBadge
                    projectId={project.id}
                    latestAt={latestCommentAt}
                  />
                </div>

                <div className="mt-3 grid grid-cols-3 gap-3">
                  <Stat icon="👁" label="조회" value={project.view_count ?? 0} />
                  <Stat icon="♥" label="좋아요" value={likeCount} />
                  <Stat icon="💬" label="댓글" value={commentCount} />
                </div>

                {comments.length > 0 ? (
                  <ul className="mt-4 flex flex-col divide-y divide-[var(--line)]">
                    {comments.map((c) => {
                      const author = c.users as { name: string | null } | null;
                      return (
                        <li key={c.id} className="py-2.5">
                          <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                            <span className="font-semibold text-ink">
                              {author?.name ?? "익명"}
                            </span>
                            <span>{formatDateTime(c.created_at)}</span>
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-sm">
                            {c.body}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-[var(--muted)]">
                    아직 댓글이 없습니다.
                  </p>
                )}
              </section>
            )}
          </div>

          {/* 오른쪽: 프로젝트 제출 */}
          <section className="card">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                프로젝트 제출
              </h2>
              <span
                className={`chip ${
                  project ? "border-team text-team" : "border-vote text-vote"
                }`}
              >
                {project ? "제출됨" : "제출 전"}
              </span>
            </div>

            {isLeader ? (
              <div className="mt-4">
                <ProjectForm project={project} />
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--muted)]">
                프로젝트 제출·수정은 팀을 대표하는 팀장 계정에서 진행합니다.
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg bg-gray-50 py-3 text-center">
      <div className="text-lg">{icon}</div>
      <div className="mt-0.5 text-xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-[var(--muted)]">{label}</div>
    </div>
  );
}
