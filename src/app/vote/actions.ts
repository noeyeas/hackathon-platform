"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// 팀이 다른 팀(project)을 기준별로 채점 (심사와 동일 방식)
export async function saveTeamScores(projectId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  // 투표(채점) 열림 여부
  const { data: settings } = await supabase
    .from("event_settings")
    .select("voting_open")
    .single();
  if (!settings?.voting_open) return { error: "지금은 투표 기간이 아닙니다" };

  // 내 팀
  const { data: membership } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return { error: "팀 소속만 채점할 수 있습니다" };

  // 자기 팀 작품은 채점 불가
  const { data: target } = await supabase
    .from("projects")
    .select("team_id")
    .eq("id", projectId)
    .single();
  if (target?.team_id === membership.team_id)
    return { error: "자기 팀은 채점할 수 없습니다" };

  const { data: criteria } = await supabase
    .from("criteria")
    .select("id, max_score");
  if (!criteria) return { error: "평가 기준을 불러오지 못했습니다" };

  const rows = criteria.map((c) => {
    const raw = Number(formData.get(`c_${c.id}`) ?? 0);
    const score = Math.max(0, Math.min(c.max_score, Math.round(raw)));
    return {
      project_id: projectId,
      voter_team_id: membership.team_id,
      criteria_id: c.id,
      score,
    };
  });

  const admin = createAdminClient();
  const { error } = await admin
    .from("team_scores")
    .upsert(rows, { onConflict: "project_id,voter_team_id,criteria_id" });
  if (error) return { error: error.message };

  revalidatePath("/vote");
  return { ok: true };
}
