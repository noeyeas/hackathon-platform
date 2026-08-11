import { createAdminClient } from "@/lib/supabase/server";

// 로그인한 사용자의 이메일이 어떤 팀의 '팀장 이메일'과 일치하면,
// 아직 소속이 없을 때 그 팀의 팀장으로 자동 연결한다. (참가 코드 대체)
// 멱등: 이미 소속이 있거나 팀에 팀장이 있으면 아무 것도 하지 않는다.
//
// ── 전제: 이메일 소유가 증명되어 있어야 한다 ──────────────────────────
// 여기서는 이메일 문자열이 같다는 것만으로 팀장 권한을 준다. 즉 이 함수의
// 안전성은 전적으로 "그 이메일로 로그인했다면 그 이메일의 주인이다"에 기댄다.
//
// 현재 로그인 수단은 구글 OAuth 와 매직링크(signInWithOtp) 둘뿐이고, 둘 다
// 메일함 접근을 요구하므로 이 전제가 성립한다.
//
// 비밀번호 가입(signUp with password)을 열면 전제가 깨진다 — 남의 이메일을
// 적어 가입하는 것만으로 그 팀의 팀장이 될 수 있다. 로그인 수단을 늘릴 때는
// 이메일 인증 여부(user.email_confirmed_at)를 함께 확인하도록 고쳐야 한다.
// ──────────────────────────────────────────────────────────────
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
