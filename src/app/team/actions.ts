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

// 항목 하나만 인라인 수정 (팀장, 마감 전). 팀 이름은 운영진 등록값으로 고정.
export async function updateTeamField(field: string, value: string) {
  const supabase = await createClient();
  const res = await requireLeaderTeam(supabase);
  if ("error" in res) return { error: res.error };

  const { data: settings } = await supabase
    .from("event_settings")
    .select("team_edit_deadline")
    .single();
  if (!canEditTeam(settings?.team_edit_deadline))
    return { error: "수정 기간이 종료되었습니다" };

  const allowed = ["tagline", "members_note"];
  if (!allowed.includes(field))
    return { error: "수정할 수 없는 항목입니다" };

  const v = value.trim();
  const { error } = await supabase
    .from("teams")
    .update({ [field]: v || null })
    .eq("id", res.teamId);
  if (error) return { error: error.message };

  revalidatePath("/mypage");
  revalidatePath("/team");
  return { ok: true };
}

