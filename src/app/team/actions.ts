"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createTeam(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  const name = String(formData.get("name") ?? "").trim();
  const tagline = String(formData.get("tagline") ?? "").trim();
  if (!name) return { error: "팀 이름을 입력하세요" };

  // 이미 팀이 있으면 중단
  const { data: existing } = await supabase
    .from("team_members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) return { error: "이미 소속된 팀이 있습니다" };

  const { data: team, error } = await supabase
    .from("teams")
    .insert({ name, tagline: tagline || null, created_by: user.id })
    .select("id")
    .single();
  if (error || !team) return { error: error?.message ?? "팀 생성 실패" };

  const { error: memberErr } = await supabase
    .from("team_members")
    .insert({ team_id: team.id, user_id: user.id, is_leader: true });
  if (memberErr) return { error: memberErr.message };

  revalidatePath("/team");
  return { ok: true };
}

export async function joinTeam(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  const code = String(formData.get("invite_code") ?? "").trim();
  if (!code) return { error: "초대 코드를 입력하세요" };

  const { data: existing } = await supabase
    .from("team_members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) return { error: "이미 소속된 팀이 있습니다" };

  const { data: team } = await supabase
    .from("teams")
    .select("id, status")
    .eq("invite_code", code)
    .maybeSingle();
  if (!team) return { error: "유효하지 않은 초대 코드입니다" };
  if (team.status === "locked") return { error: "이미 확정된 팀입니다" };

  const { count } = await supabase
    .from("team_members")
    .select("id", { count: "exact", head: true })
    .eq("team_id", team.id);
  if ((count ?? 0) >= 4) return { error: "팀 정원(4명)이 찼습니다" };

  const { error } = await supabase
    .from("team_members")
    .insert({ team_id: team.id, user_id: user.id });
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
