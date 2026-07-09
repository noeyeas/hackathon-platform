import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/ActionForm";
import { joinTeam, updateTeamInfo } from "./actions";
import { canEditTeam } from "@/lib/teamEdit";

export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="card mx-auto max-w-md text-center">
        <h1 className="text-xl font-bold">참가하려면 로그인하세요</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          운영진에게 받은 팀장 코드로 합류할 수 있습니다.
        </p>
        <Link href="/login" className="btn-primary mt-4 inline-flex">
          로그인 / 가입
        </Link>
      </div>
    );
  }

  // 내 팀 조회
  const { data: membership } = await supabase
    .from("team_members")
    .select("team_id, is_leader")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return (
      <div className="mx-auto max-w-md">
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
        <p className="mt-4 text-center text-sm text-[var(--muted)]">
          아직 팀 신청 전인가요? 구글폼으로 팀을 신청해 주세요.
        </p>
      </div>
    );
  }

  // 팀 상세
  const { data: team } = await supabase
    .from("teams")
    .select("*")
    .eq("id", membership.team_id)
    .single();

  const { data: project } = await supabase
    .from("projects")
    .select("id, title")
    .eq("team_id", membership.team_id)
    .maybeSingle();

  // 팀장이 마감(9/3) 전이면 팀 정보를 수정할 수 있다.
  const canEdit = membership.is_leader && canEditTeam();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <div className="card">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{team?.name}</h1>
            {team?.tagline && (
              <p className="mt-1 text-[var(--muted)]">{team.tagline}</p>
            )}
          </div>
          <span className="chip border-team text-team">팀장</span>
        </div>
        {team?.members_note ? (
          <div className="mt-4 rounded-lg bg-gray-50 p-4">
            <p className="text-xs font-semibold text-[var(--muted)]">팀원 구성</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">
              {team.members_note}
            </p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-[var(--muted)]">
            팀을 대표해 팀 정보를 관리하고 프로젝트를 제출합니다.
          </p>
        )}
      </div>

      {canEdit && (
        <div className="card">
          <h2 className="mb-1 font-bold">팀 정보 수정</h2>
          <p className="mb-4 text-sm text-[var(--muted)]">
            소개·팀원 구성은 9월 3일 전까지 수정할 수 있어요. 팀 이름은 운영진이
            등록한 값으로 고정됩니다.
          </p>
          <ActionForm
            action={updateTeamInfo}
            submitLabel="저장"
            successMessage="저장했습니다."
          >
            <label className="label">팀 이름</label>
            <input
              value={team?.name ?? ""}
              disabled
              className="input bg-gray-50 text-[var(--muted)]"
            />
            <label className="label mt-3">한 줄 소개</label>
            <input
              name="tagline"
              defaultValue={team?.tagline ?? ""}
              className="input"
              placeholder="우리 팀을 소개해 주세요"
            />
            <label className="label mt-3">팀원 구성 (선택)</label>
            <textarea
              name="members_note"
              rows={3}
              defaultValue={team?.members_note ?? ""}
              className="input"
              placeholder="예: 김철수(기획), 이영희(프론트), 박민수(백엔드)"
            />
          </ActionForm>
        </div>
      )}

      <Link href="/submit" className="btn-primary">
        {project ? "제출물 수정" : "프로젝트 제출하기"}
      </Link>
    </div>
  );
}
