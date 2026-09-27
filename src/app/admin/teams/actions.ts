"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { adminError } from "@/lib/actionError";
import { requireAdmin } from "@/lib/auth";
import { teamLabel } from "@/lib/format";
import { revalidatePath, updateTag } from "next/cache";

// 선정된 팀을 운영진이 등록. 구글폼에서 받은 팀장 이메일을 함께 등록하면,
// 그 이메일로 로그인한 사용자가 자동으로 팀장으로 연결된다. (참가 코드 불필요)
export async function createTeamAsAdmin(formData: FormData) {
  if (!(await requireAdmin())) return { error: "운영진만 가능합니다" };
  const name = String(formData.get("name") ?? "").trim();
  const tagline = String(formData.get("tagline") ?? "").trim();
  const leaderEmail = String(formData.get("leader_email") ?? "")
    .trim()
    .toLowerCase();
  if (!name) return { error: "팀 이름을 입력하세요" };
  const teamNo = parseTeamNo(String(formData.get("team_no") ?? ""));
  if (teamNo === false) return { error: "조 번호는 1 이상 정수입니다" };

  const admin = createAdminClient();
  const { error } = await admin.from("teams").insert({
    name,
    team_no: teamNo,
    tagline: tagline || null,
    leader_email: leaderEmail || null,
  });
  if (error) return { error: adminError(error) };
  revalidatePath("/admin/teams");
  return { ok: true };
}

// 등록된 팀의 팀장 이메일 설정/수정
export async function setTeamLeaderEmail(id: string, email: string) {
  if (!(await requireAdmin())) return { error: "운영진만 가능합니다" };
  const value = email.trim().toLowerCase();
  const admin = createAdminClient();
  const { error } = await admin
    .from("teams")
    .update({ leader_email: value || null })
    .eq("id", id);
  if (error) return { error: adminError(error) };
  revalidatePath("/admin/teams");
  return { ok: true };
}

// 팀장 연결을 '팀장 이메일'에 맞게 옮긴다.
//
// 왜 필요한가: 자동 연결(ensureLeaderMembership)은 팀에 이미 팀장이 있으면
// 아무 것도 하지 않는다. 그래서 팀장이 한 번 연결된 뒤에 leader_email 만
// 고치면(이메일을 잘못 받았거나 참가자가 바꿔 달라고 하면) 새 계정은 영영
// 연결되지 않고, 구 계정이 계속 그 팀의 팀장으로 남는다. 운영진이 이 액션으로
// 연결을 직접 옮긴다. 제출물·점수는 팀에 달려 있으므로 함께 옮겨진다.
export async function relinkTeamLeader(teamId: string) {
  if (!(await requireAdmin())) return { error: "운영진만 가능합니다" };
  const admin = createAdminClient();

  const { data: team } = await admin
    .from("teams")
    .select("leader_email")
    .eq("id", teamId)
    .maybeSingle();
  const email = (team?.leader_email ?? "").trim().toLowerCase();
  if (!email) return { error: "팀장 이메일을 먼저 설정하세요" };

  const [{ data: current }, { data: user }] = await Promise.all([
    admin.from("team_members").select("id, user_id").eq("team_id", teamId).eq("is_leader", true),
    admin.from("users").select("id").eq("email", email).maybeSingle(),
  ]);

  if (user && current?.some((m) => m.user_id === user.id))
    return { ok: true, message: `이미 ${email} 계정이 팀장입니다.` };

  // 1인 1팀(unique(user_id))이라 다른 팀 소속인 계정은 옮길 수 없다.
  // DB 오류로 흘려보내지 말고 어느 팀에 묶여 있는지 알려 준다.
  if (user) {
    const { data: other } = await admin
      .from("team_members")
      .select("team_id, teams(name, team_no)")
      .eq("user_id", user.id)
      .maybeSingle();
    if (other && other.team_id !== teamId) {
      const t = other.teams as unknown as { name: string; team_no: number | null } | null;
      return {
        error: `${email} 계정은 이미 ${
          t ? teamLabel(t.team_no, t.name) : "다른"
        } 팀 소속입니다. 그 팀에서 먼저 연결을 해제하세요.`,
      };
    }
  }

  // 낡은 팀장 연결을 끊는다. (계정 자체는 남는다 — 소속만 사라진다)
  if (current?.length) {
    const { error } = await admin
      .from("team_members")
      .delete()
      .in(
        "id",
        current.map((m) => m.id)
      );
    if (error) return { error: adminError(error) };
  }

  // 새 이메일이 아직 로그인한 적이 없으면 users 행이 없다. 낡은 연결을 끊어
  // 두는 것만으로 충분하다 — 다음 로그인 때 자동 연결이 이어 준다.
  if (!user) {
    revalidateTeamScreens();
    return {
      ok: true,
      message: `${email} 은 아직 로그인한 적이 없습니다. 낡은 연결만 해제했으니, 그 이메일로 로그인해 사이트를 열면 자동으로 팀장이 됩니다.`,
    };
  }

  // 이미 같은 팀의 팀원이면 그 행을 팀장으로 올린다.
  const { data: inTeam } = await admin
    .from("team_members")
    .select("id")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .maybeSingle();
  const { error } = inTeam
    ? await admin.from("team_members").update({ is_leader: true }).eq("id", inTeam.id)
    : await admin.from("team_members").insert({ team_id: teamId, user_id: user.id, is_leader: true });
  if (error) return { error: adminError(error) };

  revalidateTeamScreens();
  return { ok: true, message: `팀장을 ${email} 계정으로 연결했습니다.` };
}

// 계정 연결만 끊는다 — 계정·제출물·점수는 그대로다(제출물은 팀에 달려 있다).
// 끊은 뒤 그 이메일이 아직 팀의 leader_email 이면 다음 로그인 때 다시 이어진다.
export async function unlinkTeamMember(teamId: string, email: string) {
  if (!(await requireAdmin())) return { error: "운영진만 가능합니다" };
  const admin = createAdminClient();
  const { data: user } = await admin
    .from("users")
    .select("id")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  if (!user) return { error: "그 이메일의 계정을 찾을 수 없습니다" };
  const { error } = await admin
    .from("team_members")
    .delete()
    .eq("team_id", teamId)
    .eq("user_id", user.id);
  if (error) return { error: adminError(error) };
  revalidateTeamScreens();
  return { ok: true };
}

// 조 번호 설정/해제(0058). 빈 값이면 번호를 지운다. 중복이면 DB unique 가 막는다.
export async function setTeamNo(id: string, raw: string) {
  if (!(await requireAdmin())) return { error: "운영진만 가능합니다" };
  const teamNo = parseTeamNo(raw);
  if (teamNo === false) return { error: "조 번호는 1 이상 정수입니다" };
  const admin = createAdminClient();
  const { error } = await admin.from("teams").update({ team_no: teamNo }).eq("id", id);
  if (error)
    return {
      error: error.code === "23505" ? "이미 다른 팀이 쓰는 번호입니다" : adminError(error),
    };
  revalidateTeamScreens();
  return { ok: true };
}

// "" → null(번호 없음), 양의 정수 → 숫자, 그 외 → false(입력 오류)
function parseTeamNo(raw: string): number | null | false {
  const v = raw.trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 ? n : false;
}

// 조 번호·기권처럼 팀 표기가 바뀌는 변경은 팀 이름이 보이는 화면을 모두 갱신한다.
function revalidateTeamScreens() {
  for (const p of [
    "/admin/teams",
    "/admin",
    "/admin/scoring",
    "/admin/midterm",
    "/admin/audience",
    "/vote",
    "/gallery",
    "/results",
  ])
    revalidatePath(p);
  // 갤러리 목록은 캐시를 타므로 경로 갱신만으로는 바뀌지 않는다.
  // 조 번호 표기와 기권 제외가 둘 다 이 캐시 안에 들어 있다.
  updateTag("gallery");
}

// 기권 처리/취소. 삭제와 달리 팀원 연결·제출물이 남고, 심사·상호평가·집계
// 대상에서만 빠진다(0056). 되돌릴 수 있다.
export async function setTeamWithdrawn(id: string, withdrawn: boolean) {
  if (!(await requireAdmin())) return { error: "운영진만 가능합니다" };
  const admin = createAdminClient();
  const { error } = await admin
    .from("teams")
    .update({ status: withdrawn ? "withdrawn" : "forming" })
    .eq("id", id);
  if (error) return { error: adminError(error) };
  revalidateTeamScreens();
  return { ok: true };
}

export async function deleteTeamAsAdmin(id: string) {
  if (!(await requireAdmin())) return { error: "운영진만 가능합니다" };
  const admin = createAdminClient();
  const { error } = await admin.from("teams").delete().eq("id", id);
  if (error) return { error: adminError(error) };
  revalidatePath("/admin/teams");
  return { ok: true };
}
