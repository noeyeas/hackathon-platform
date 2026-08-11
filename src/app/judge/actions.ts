"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { safeError } from "@/lib/actionError";
import { clampScore } from "@/lib/scoring";

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

  // 코멘트를 첫 행에만 싣기 위해 순서를 고정한다(정렬 없이는 매번 달라짐).
  const { data: criteria } = await supabase
    .from("criteria")
    .select("id, max_score")
    .order("sort");
  if (!criteria) return { error: "평가 기준을 불러오지 못했습니다" };

  // 코멘트는 기준별이 아니라 (프로젝트, 심사위원) 단위 속성이다. 모든 행에
  // 복제해 넣으면 기준 수만큼 같은 값이 쌓이고 수정 시 정합성이 깨지므로
  // 첫 기준 행에만 저장한다. 읽는 쪽(ScoreCard)은 값이 있는 행을 찾는다.
  const comment = String(formData.get("comment") ?? "").trim() || null;

  const rows = criteria.map((c, i) => {
    const score = clampScore(formData.get(`c_${c.id}`), c.max_score);
    return {
      project_id: projectId,
      judge_id: user.id,
      criteria_id: c.id,
      score,
      comment: i === 0 ? comment : null,
    };
  });

  // 운영진도 저장 가능하도록 서버(Service Role)로 기록 (역할은 위에서 검증)
  const admin = createAdminClient();
  const { error } = await admin
    .from("judge_scores")
    .upsert(rows, { onConflict: "project_id,judge_id,criteria_id" });
  if (error)
    return { error: safeError(error, "점수 저장에 실패했어요. 잠시 후 다시 시도해 주세요.") };

  revalidatePath("/judge");
  return { ok: true };
}
