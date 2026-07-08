import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, tagline, invite_code, status, team_members(count)")
    .order("created_at", { ascending: true });

  const list = teams ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">팀 등록</h1>
      <p className="mt-1 text-[var(--muted)]">
        구글폼으로 신청받아 선정한 팀을 등록하세요. 등록하면 초대 코드가
        발급됩니다. 그 코드를 팀장에게 전달하면, 팀장이 코드로 먼저 합류(자동
        팀장)한 뒤 팀원에게 공유합니다.
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
              const memberCount =
                (t.team_members as unknown as { count: number }[])?.[0]
                  ?.count ?? 0;
              return (
                <TeamRow
                  key={t.id}
                  id={t.id}
                  name={t.name}
                  tagline={t.tagline}
                  inviteCode={t.invite_code}
                  memberCount={memberCount}
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
