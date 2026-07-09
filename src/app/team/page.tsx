import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/ActionForm";
import { joinTeam } from "./actions";
import { EditableField } from "./EditableField";
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
          <h1 className="text-2xl font-bold">{team?.name}</h1>
          <span className="chip border-team text-team">팀장</span>
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
          {canEdit && (
            <p className="text-xs text-[var(--muted)]">
              소개·팀원 구성은 9월 3일 전까지 수정할 수 있어요. 팀 이름은 운영진
              등록값으로 고정됩니다.
            </p>
          )}
        </div>
      </div>

      <Link href="/submit" className="btn-primary">
        {project ? "제출물 수정" : "프로젝트 제출하기"}
      </Link>
    </div>
  );
}
