"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// 투표 열림/닫힘 토글
export async function setVotingOpen(open: boolean) {
  if (!(await requireAdmin())) return { error: "운영진만 가능합니다" };
  const admin = createAdminClient();
  const { error } = await admin
    .from("event_settings")
    .update({ voting_open: open })
    .eq("id", 1);
  if (error) return { error: error.message };
  revalidatePath("/admin/scoring");
  revalidatePath("/vote");
  return { ok: true };
}

// 주민 스티커 득표수 저장 (팀 하나)
export async function setAudienceVotes(projectId: string, count: number) {
  if (!(await requireAdmin())) return { error: "운영진만 가능합니다" };
  const n = Math.max(0, Math.round(count) || 0);
  const admin = createAdminClient();
  const { error } = await admin
    .from("projects")
    .update({ audience_votes_manual: n })
    .eq("id", projectId);
  if (error) return { error: error.message };
  revalidatePath("/admin/scoring");
  revalidatePath("/results");
  return { ok: true };
}

// 여러 팀 한 번에 저장 — 현장 집계는 여러 줄을 몰아서 넣게 되므로
// 줄마다 왕복하지 않고 한 번에 보낸다(행사장 네트워크에서 체감 차이가 크다).
export async function setAudienceVotesBulk(
  entries: { projectId: string; count: number }[]
) {
  if (!(await requireAdmin())) return { error: "운영진만 가능합니다" };
  if (entries.length === 0) return { ok: true, saved: 0 };

  const admin = createAdminClient();
  const results = await Promise.all(
    entries.map(({ projectId, count }) =>
      admin
        .from("projects")
        .update({
          audience_votes_manual: Math.max(0, Math.round(count) || 0),
        })
        .eq("id", projectId)
    )
  );

  const failed = results.filter((r) => r.error).length;
  revalidatePath("/admin/scoring");
  revalidatePath("/results");
  if (failed > 0)
    return { error: `${entries.length}팀 중 ${failed}팀 저장에 실패했습니다` };
  return { ok: true, saved: entries.length };
}
