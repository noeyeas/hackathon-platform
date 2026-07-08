"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// 한 팀(project)에 대한 기준별 점수 저장 (전 심사위원이 전 팀 채점)
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
  if (me?.role !== "judge") return { error: "심사위원만 채점할 수 있습니다" };

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

  const { error } = await supabase
    .from("judge_scores")
    .upsert(rows, { onConflict: "project_id,judge_id,criteria_id" });
  if (error) return { error: error.message };

  revalidatePath("/judge");
  return { ok: true };
}
