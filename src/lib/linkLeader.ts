import { createAdminClient } from "@/lib/supabase/server";

// 로그인한 사용자의 이메일이 어떤 팀의 '팀장 이메일'과 일치하면,
// 아직 소속이 없을 때 그 팀의 팀장으로 자동 연결한다. (참가 코드 대체)
// 멱등: 이미 소속이 있거나 팀에 팀장이 있으면 아무 것도 하지 않는다.
export async function ensureLeaderMembership(
  userId: string,
  email: string | null | undefined
) {
  if (!email) return;
  const admin = createAdminClient();

  // 이미 소속이 있으면 종료
  const { data: existing } = await admin
    .from("team_members")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) return;

  // 이메일이 팀장 이메일로 등록된 팀 찾기 (소문자 비교)
  const { data: teams } = await admin
    .from("teams")
    .select("id, team_members(is_leader)")
    .eq("leader_email", email.toLowerCase())
    .limit(1);
  const team = teams?.[0];
  if (!team) return;

  const hasLeader =
    (team.team_members as { is_leader: boolean }[] | null)?.some(
      (m) => m.is_leader
    ) ?? false;
  if (hasLeader) return;

  // 팀장으로 연결 (동시 요청 대비: 실패는 조용히 무시 — unique(user_id))
  await admin
    .from("team_members")
    .insert({ team_id: team.id, user_id: userId, is_leader: true });
}
