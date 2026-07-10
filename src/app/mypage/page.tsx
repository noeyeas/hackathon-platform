import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EditableField } from "../team/EditableField";
import { ProjectForm } from "../submit/ProjectForm";
import { TeamName } from "@/components/TeamName";
import { canEditTeam } from "@/lib/teamEdit";
import { ensureLeaderMembership } from "@/lib/linkLeader";
import { NewCommentsDot } from "./NewCommentsDot";

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

  // 팀장 이메일로 등록된 팀에 자동 연결 (참가 코드 대체)
  await ensureLeaderMembership(user.id, user.email);

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

  // 내 작품 반응 (조회·좋아요·댓글 수). 세부 댓글은 갤러리에서 확인.
  let likeCount = 0;
  let commentCount = 0;
  let latestCommentAt: string | null = null;
  if (project) {
    const [{ count: lc }, { count: cc }, { data: latest }] = await Promise.all([
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
        .select("created_at")
        .eq("project_id", project.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    likeCount = lc ?? 0;
    commentCount = cc ?? 0;
    latestCommentAt = latest?.created_at ?? null;
  }

  const { data: editSettings } = await supabase
    .from("event_settings")
    .select("team_edit_deadline")
    .single();
  const canEdit = isLeader && canEditTeam(editSettings?.team_edit_deadline);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">마이페이지</h1>
        <p className="mt-1 text-[var(--muted)]">
          {me?.name ?? me?.email}님, 환영합니다.
        </p>
      </div>

      {/* 팀 미연결 안내 */}
      {!membership && (
        <div className="card mx-auto w-full max-w-md text-center">
          <h2 className="text-lg font-bold">연결된 팀이 없습니다</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            팀은 운영진이 선정·등록하며, 구글폼에 적어 주신 <b>팀장 이메일</b>로
            로그인하면 자동으로 연결됩니다. 현재 계정({me?.email})으로 연결된
            팀이 없어요. 이메일이 맞는지 운영진에게 문의해 주세요.
          </p>
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
                <NewCommentsDot
                  projectId={project.id}
                  latestAt={latestCommentAt}
                />

                <div className="mt-3 grid grid-cols-3 gap-3">
                  <Stat icon="👁" label="조회" value={project.view_count ?? 0} tone="sky" />
                  <Stat icon="♥" label="응원" value={likeCount} tone="rose" />
                  <Stat icon="💬" label="댓글" value={commentCount} tone="amber" />
                </div>

                <Link
                  href={`/gallery/${project.id}`}
                  className="mt-4 block text-center text-sm text-[var(--muted)] hover:text-vote"
                >
                  갤러리에서 댓글 확인 →
                </Link>
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

const STAT_TONES = {
  sky: "bg-sky-50 text-sky-600",
  rose: "bg-rose-50 text-rose-500",
  amber: "bg-amber-50 text-amber-600",
} as const;

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: string;
  label: string;
  value: number;
  tone: keyof typeof STAT_TONES;
}) {
  return (
    <div className={`rounded-lg py-3 text-center ${STAT_TONES[tone]}`}>
      <div className="text-lg">{icon}</div>
      <div className="mt-0.5 text-xl font-bold tabular-nums">{value}</div>
      <div className="text-xs opacity-70">{label}</div>
    </div>
  );
}
