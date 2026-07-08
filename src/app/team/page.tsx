import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/ActionForm";
import { joinTeam, lockTeam, updateTeamInfo } from "./actions";
import { canEditTeam } from "@/lib/teamEdit";
import { MemberRemoveButton } from "./MemberRemoveButton";

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
          팀을 만들거나 초대 코드로 합류할 수 있습니다.
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
          <h2 className="text-lg font-bold">코드로 합류</h2>
          <p className="mb-4 mt-1 text-sm text-[var(--muted)]">
            팀은 운영진이 선정·등록합니다. 팀장은 운영진에게 받은{" "}
            <b>팀장 코드</b>로 먼저 합류하고, 팀원은 팀장에게 받은{" "}
            <b>팀원 코드</b>를 입력하세요.
          </p>
          <ActionForm action={joinTeam} submitLabel="팀 합류">
            <label className="label">팀장 코드 / 팀원 코드</label>
            <input name="invite_code" required className="input font-mono" placeholder="a1b2c3d4" />
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

  const { data: members } = await supabase
    .from("team_members")
    .select("user_id, is_leader, users(name, email)")
    .eq("team_id", membership.team_id);

  const { data: project } = await supabase
    .from("projects")
    .select("id, title")
    .eq("team_id", membership.team_id)
    .maybeSingle();

  const count = members?.length ?? 0;
  const locked = team?.status === "locked";
  // 팀장이 마감(9/3) 전이면 팀 정보·팀원을 수정할 수 있다.
  const canEdit = membership.is_leader && !locked && canEditTeam();

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
          <span
            className={`chip ${
              locked ? "border-team text-team" : "border-vote text-vote"
            }`}
          >
            {locked ? "확정됨" : "모집 중"}
          </span>
        </div>

        {!locked && (
          <div className="mt-4 rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-[var(--muted)]">팀원 초대 코드</p>
            <p className="mt-1 select-all font-mono text-lg font-bold">
              {team?.invite_code}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              이 코드를 팀원에게 공유하세요. (현재 {count}/4명)
            </p>
          </div>
        )}
      </div>

      {canEdit && (
        <div className="card">
          <h2 className="mb-1 font-bold">팀 정보 수정</h2>
          <p className="mb-4 text-sm text-[var(--muted)]">
            팀 이름·소개는 9월 3일 전까지 수정할 수 있어요.
          </p>
          <ActionForm
            action={updateTeamInfo}
            submitLabel="저장"
            successMessage="저장했습니다."
          >
            <label className="label">팀 이름</label>
            <input
              name="name"
              required
              defaultValue={team?.name ?? ""}
              className="input"
            />
            <label className="label mt-3">한 줄 소개</label>
            <input
              name="tagline"
              defaultValue={team?.tagline ?? ""}
              className="input"
              placeholder="우리 팀을 소개해 주세요"
            />
          </ActionForm>
        </div>
      )}

      <div className="card">
        <h2 className="mb-3 font-bold">팀원 ({count}/4)</h2>
        <ul className="flex flex-col divide-y divide-[var(--line)]">
          {members?.map((m, i) => {
            const u = m.users as unknown as { name: string | null; email: string };
            const label = u?.name ?? u?.email;
            return (
              <li key={i} className="flex items-center justify-between py-2.5">
                <span className="text-sm">{label}</span>
                <div className="flex items-center gap-3">
                  {m.is_leader && <span className="chip">리더</span>}
                  {canEdit && !m.is_leader && (
                    <MemberRemoveButton userId={m.user_id} name={label} />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {canEdit && (
          <p className="mt-3 text-xs text-[var(--muted)]">
            팀원 구성은 9월 3일 전까지 변경할 수 있어요.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        {!locked && membership.is_leader && (
          <form
            action={async () => {
              "use server";
              await lockTeam();
            }}
            className="flex-1"
          >
            <button
              className="btn-ghost w-full"
              disabled={count < 2 || count > 4}
              title={count < 2 ? "최소 2명 필요" : ""}
            >
              팀 확정하기 (2~4명)
            </button>
          </form>
        )}
        <Link href="/submit" className="btn-primary flex-1">
          {project ? "제출물 수정" : "프로젝트 제출하기"}
        </Link>
      </div>
    </div>
  );
}
