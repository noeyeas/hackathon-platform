"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function joinTeam(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  const code = String(formData.get("invite_code") ?? "").trim();
  if (!code) return { error: "코드를 입력하세요" };

  const { data: existing } = await supabase
    .from("team_members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) return { error: "이미 소속된 팀이 있습니다" };

  // 팀장 코드(leader_code) → 팀장으로, 팀원 코드(invite_code) → 팀원으로 합류
  let team: { id: string; status: string } | null = null;
  let asLeader = false;

  const { data: byLeader } = await supabase
    .from("teams")
    .select("id, status")
    .eq("leader_code", code)
    .maybeSingle();
  if (byLeader) {
    team = byLeader;
    asLeader = true;
  } else {
    const { data: byInvite } = await supabase
      .from("teams")
      .select("id, status")
      .eq("invite_code", code)
      .maybeSingle();
    team = byInvite ?? null;
  }
  if (!team) return { error: "유효하지 않은 코드입니다" };
  if (team.status === "locked") return { error: "이미 확정된 팀입니다" };

  const { data: members } = await supabase
    .from("team_members")
    .select("is_leader")
    .eq("team_id", team.id);
  const memberCount = members?.length ?? 0;
  const hasLeader = members?.some((m) => m.is_leader) ?? false;

  if (asLeader && hasLeader)
    return { error: "이미 팀장이 합류한 팀입니다" };
  if (!asLeader && !hasLeader)
    return {
      error: "아직 팀장이 합류하지 않았습니다. 팀장에게 먼저 합류를 요청하세요.",
    };
  if (memberCount >= 4) return { error: "팀 정원(4명)이 찼습니다" };

  const { error } = await supabase
    .from("team_members")
    .insert({ team_id: team.id, user_id: user.id, is_leader: asLeader });
  if (error) return { error: error.message };

  revalidatePath("/team");
  return { ok: true };
}

export async function lockTeam() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  const { data: membership } = await supabase
    .from("team_members")
    .select("team_id, is_leader")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership?.is_leader)
    return { error: "팀 리더만 확정할 수 있습니다" };

  const { error } = await supabase
    .from("teams")
    .update({ status: "locked" })
    .eq("id", membership.team_id);
  if (error) return { error: error.message };

  revalidatePath("/team");
  return { ok: true };
}
