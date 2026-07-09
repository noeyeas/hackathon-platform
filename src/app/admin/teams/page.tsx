import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/ActionForm";
import { createTeamAsAdmin } from "./actions";
import { TeamRow } from "./TeamRow";

export const dynamic = "force-dynamic";

export default async function AdminTeamsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") redirect("/");

  // 이메일 등 팀원 정보는 RLS 우회를 위해 Service Role 로 조회
  const admin = createAdminClient();
  const { data: teams } = await admin
    .from("teams")
    .select(
      "id, name, tagline, invite_code, leader_code, status, team_members(is_leader, users(email, name))"
    )
    .order("created_at", { ascending: true });

  const list = teams ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">팀 등록</h1>
      <p className="mt-1 text-[var(--muted)]">
        구글폼으로 신청받아 선정한 팀을 등록하세요. 등록하면 <b>팀장 코드</b>가
        발급됩니다. 팀을 대표하는 팀장에게 코드를 전달하면, 팀장이 합류해 팀
        정보를 관리하고 프로젝트를 제출합니다.
      </p>

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
                  leaderCode={t.leader_code}
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
