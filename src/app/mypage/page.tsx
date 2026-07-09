import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/ActionForm";
import { joinTeam } from "../team/actions";
import { TeamInfoForm } from "../team/TeamInfoForm";
import { ProjectForm } from "../submit/ProjectForm";
import { TeamName } from "@/components/TeamName";
import { canEditTeam } from "@/lib/teamEdit";

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
          "title, description, repo_url, demo_url, video_url, deck_url"
        )
        .eq("team_id", membership.team_id)
        .maybeSingle()
    : { data: null };

  const canEdit = isLeader && canEditTeam();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">마이페이지</h1>
        <p className="mt-1 text-[var(--muted)]">
          {me?.name ?? me?.email}님, 환영합니다.
        </p>
      </div>

      {/* 팀 미소속 — 팀장 코드로 합류 */}
      {!membership && (
        <div className="card">
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

      {/* 내 팀 */}
      {membership && (
        <section className="card">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                내 팀
              </h2>
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
              {team?.tagline && (
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {team.tagline}
                </p>
              )}
            </div>
          </div>

          {team?.members_note && (
            <div className="mt-4 rounded-lg bg-gray-50 p-4">
              <p className="text-xs font-semibold text-[var(--muted)]">
                팀원 구성
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm">
                {team.members_note}
              </p>
            </div>
          )}

          {canEdit ? (
            <div className="mt-5 border-t border-[var(--line)] pt-5">
              <h3 className="mb-1 font-bold">팀 정보 수정</h3>
              <p className="mb-4 text-sm text-[var(--muted)]">
                소개·팀원 구성은 9월 3일 전까지 수정할 수 있어요. 팀 이름은
                운영진이 등록한 값으로 고정됩니다.
              </p>
              <TeamInfoForm
                team={{
                  name: team?.name ?? "",
                  tagline: team?.tagline ?? null,
                  members_note: team?.members_note ?? null,
                }}
              />
            </div>
          ) : (
            isLeader && (
              <p className="mt-4 text-sm text-[var(--muted)]">
                수정 기간이 종료되어 팀 정보를 변경할 수 없습니다.
              </p>
            )
          )}
        </section>
      )}

      {/* 프로젝트 제출 */}
      {membership && (
        <section className="card">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              프로젝트 제출
            </h2>
            <span
              className={`chip ${
                project
                  ? "border-team text-team"
                  : "border-vote text-vote"
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
      )}

      {/* 바로가기 */}
      {membership && (
        <div className="flex flex-wrap gap-3">
          {isLeader && (
            <Link href="/vote" className="btn-ghost">
              다른 팀 평가하기 →
            </Link>
          )}
          <Link href="/gallery" className="btn-ghost">
            갤러리 보기 →
          </Link>
        </div>
      )}
    </div>
  );
}
