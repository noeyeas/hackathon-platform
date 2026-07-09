"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// 한 팀(project)에 대한 기준별 점수 저장 (심사위원·운영진이 전 팀 채점)
export async function saveScores(projectId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  const { data: me } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "judge" && me?.role !== "admin")
    return { error: "심사위원·운영진만 채점할 수 있습니다" };

  // 온라인 평가 열림 여부 (운영진 토글) — 닫혀 있으면 심사·팀 평가 모두 저장 불가
  const { data: settings } = await supabase
    .from("event_settings")
    .select("voting_open")
    .single();
  if (!settings?.voting_open)
    return { error: "지금은 평가 기간이 아닙니다" };

  const { data: criteria } = await supabase.from("criteria").select("id, max_score");
  if (!criteria) return { error: "평가 기준을 불러오지 못했습니다" };

  const rows = criteria.map((c) => {
    const raw = Number(formData.get(`c_${c.id}`) ?? 0);
    const score = Math.max(0, Math.min(c.max_score, Math.round(raw)));
    return {
      project_id: projectId,
      judge_id: user.id,
      criteria_id: c.id,
      score,
      comment: String(formData.get("comment") ?? "").trim() || null,
    };
  });

  // 운영진도 저장 가능하도록 서버(Service Role)로 기록 (역할은 위에서 검증)
  const admin = createAdminClient();
  const { error } = await admin
    .from("judge_scores")
    .upsert(rows, { onConflict: "project_id,judge_id,criteria_id" });
  if (error) return { error: error.message };

  revalidatePath("/judge");
  return { ok: true };
}
