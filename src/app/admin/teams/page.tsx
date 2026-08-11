import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { ActionForm } from "@/components/ActionForm";
import { createTeamAsAdmin } from "./actions";
import { TeamRow } from "./TeamRow";
import { AdminPageHeader } from "../AdminPageHeader";

export const dynamic = "force-dynamic";

export default async function AdminTeamsPage() {
  // 레이아웃의 검사는 이 페이지의 렌더를 막지 못한다(병렬 렌더). 서비스 롤로
  // 조회하기 전에 여기서 직접 확인한다 — 통과 못 하면 레이아웃이 안내 화면을
  // 대신 보여주므로 아무것도 그리지 않는다.
  if (!(await requireAdmin())) return null;

  // 이메일 등 팀원 정보는 RLS 우회를 위해 Service Role 로 조회
  const admin = createAdminClient();
  const { data: teams } = await admin
    .from("teams")
    .select(
      "id, name, tagline, leader_email, status, team_members(is_leader, users(email, name))"
    )
    .order("created_at", { ascending: true });

  const list = teams ?? [];

  return (
    <div className="mx-auto max-w-2xl lg:mx-0">
      <AdminPageHeader
        title="팀 등록"
        desc={
          <>
            구글폼으로 신청받아 선정한 팀을 등록하세요. <b>팀장 이메일</b>을 함께
            입력하면, 그 이메일로 로그인한 팀장이 자동으로 연결되어 팀 정보를
            관리하고 프로젝트를 제출합니다. (참가 코드 불필요)
          </>
        }
      />

      {/* 팀 등록 */}
      <div className="card mt-6">
        <h2 className="mb-1 font-bold">선정팀 등록</h2>
        <p className="mb-4 text-sm text-[var(--muted)]">
          현재 {list.length}개 팀 등록됨.
        </p>
        <ActionForm
          action={createTeamAsAdmin}
          submitLabel="팀 등록"
          successMessage="등록했습니다. 새로고침하면 목록에 나타납니다."
        >
          <label className="label">팀 이름 *</label>
          <input
            name="name"
            required
            className="input"
            placeholder="예: 코드마법사"
          />
          <label className="label mt-3">팀장 이메일 *</label>
          <input
            name="leader_email"
            type="email"
            className="input"
            placeholder="leader@example.com"
          />
          <label className="label mt-3">한 줄 소개 (선택)</label>
          <input
            name="tagline"
            className="input"
            placeholder="우리 팀을 소개해 주세요"
          />
        </ActionForm>
      </div>

      {/* 등록된 팀 목록 */}
      {list.length > 0 && (
        <div className="card mt-6">
          <h2 className="mb-4 font-bold">등록된 팀 ({list.length})</h2>
          <div className="flex flex-col gap-2">
            {list.map((t) => {
              const raw =
                (t.team_members as unknown as {
                  is_leader: boolean;
                  users: { email: string; name: string | null } | null;
                }[]) ?? [];
              const members = raw
                .map((m) => ({
                  email: m.users?.email ?? "",
                  name: m.users?.name ?? null,
                  isLeader: m.is_leader,
                }))
                .sort((a, b) => Number(b.isLeader) - Number(a.isLeader));
              return (
                <TeamRow
                  key={t.id}
                  id={t.id}
                  name={t.name}
                  tagline={t.tagline}
                  leaderEmail={t.leader_email}
                  members={members}
                  locked={t.status === "locked"}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
