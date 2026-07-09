import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EditableField } from "./EditableField";
import { canEditTeam } from "@/lib/teamEdit";
import { ensureLeaderMembership } from "@/lib/linkLeader";

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
          구글폼에 적어 주신 팀장 이메일로 로그인하면 팀이 자동으로 연결됩니다.
        </p>
        <Link href="/login" className="btn-primary mt-4 inline-flex">
          로그인 / 가입
        </Link>
      </div>
    );
  }

  // 팀장 이메일로 등록된 팀에 자동 연결
  await ensureLeaderMembership(user.id, user.email);

  // 내 팀 조회
  const { data: membership } = await supabase
    .from("team_members")
    .select("team_id, is_leader")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return (
      <div className="card mx-auto max-w-md text-center">
        <h1 className="text-xl font-bold">연결된 팀이 없습니다</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          구글폼에 적어 주신 <b>팀장 이메일</b>로 로그인하면 자동으로 연결됩니다.
          현재 계정으로 연결된 팀이 없어요. 이메일이 맞는지 운영진에게 문의해
          주세요.
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
          {membership.is_leader && (
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
