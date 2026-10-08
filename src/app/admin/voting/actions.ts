"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { adminError } from "@/lib/actionError";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { finalistsLocked, SCORE_LOCK_MESSAGE } from "@/lib/scoreLock";

// 투표 열림/닫힘 토글
export async function setVotingOpen(open: boolean) {
  if (!(await requireAdmin())) return { error: "운영진만 가능합니다" };
  // 닫는 것은 언제든 된다. 여는 것만 막는다 — 주민투표 중에 상호평가가
  // 다시 열리면 1차 점수가 바뀌어 진출팀이 달라질 수 있다.
  if (open && (await finalistsLocked())) return { error: SCORE_LOCK_MESSAGE };
  const admin = createAdminClient();
  const { error } = await admin
    .from("event_settings")
    .update({ voting_open: open })
    .eq("id", 1);
  if (error) return { error: adminError(error) };
  revalidatePath("/admin/scoring");
  revalidatePath("/vote");
  return { ok: true };
}
