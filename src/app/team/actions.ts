"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { canEditTeam } from "@/lib/teamEdit";

// 로그인 팀장 확인. 성공 시 team_id 반환.
async function requireLeaderTeam(
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" as const };

  const { data: membership } = await supabase
    .from("team_members")
    .select("team_id, is_leader")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership?.is_leader)
    return { error: "팀장만 수정할 수 있습니다" as const };
  return { teamId: membership.team_id as string };
}

export async function joinTeam(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  const code = String(formData.get("leader_code") ?? "").trim();
  if (!code) return { error: "팀장 코드를 입력하세요" };

  const { data: existing } = await supabase
    .from("team_members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) return { error: "이미 소속된 팀이 있습니다" };

  // 팀장 코드로만 합류 (팀장 대표 계정)
  const { data: team } = await supabase
    .from("teams")
    .select("id, status")
    .eq("leader_code", code)
    .maybeSingle();
  if (!team) return { error: "유효하지 않은 팀장 코드입니다" };
  if (team.status === "locked") return { error: "이미 확정된 팀입니다" };

  const { data: members } = await supabase
    .from("team_members")
    .select("is_leader")
    .eq("team_id", team.id);
  const hasLeader = members?.some((m) => m.is_leader) ?? false;
  if (hasLeader) return { error: "이미 팀장이 합류한 팀입니다" };

  const { error } = await supabase
    .from("team_members")
    .insert({ team_id: team.id, user_id: user.id, is_leader: true });
  if (error) return { error: error.message };

  revalidatePath("/team");
  return { ok: true };
}

// 팀 소개·팀원 구성 수정 (팀장, 마감 전). 팀 이름은 운영진 등록값으로 고정.
export async function updateTeamInfo(formData: FormData) {
  const supabase = await createClient();
  const res = await requireLeaderTeam(supabase);
  if ("error" in res) return { error: res.error };
  if (!canEditTeam())
    return { error: "수정 기간이 종료되었습니다 (9월 3일 마감)" };

  const tagline = String(formData.get("tagline") ?? "").trim();
  const membersNote = String(formData.get("members_note") ?? "").trim();

  const { error } = await supabase
    .from("teams")
    .update({
      tagline: tagline || null,
      members_note: membersNote || null,
    })
    .eq("id", res.teamId);
  if (error) return { error: error.message };

  revalidatePath("/team");
  return { ok: true };
}

