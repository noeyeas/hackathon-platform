"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { EventPhase } from "@/lib/types";

export async function setPhase(phase: EventPhase) {
  if (!(await requireAdmin())) return { error: "운영진만 가능합니다" };
  const admin = createAdminClient();
  const { error } = await admin
    .from("event_settings")
    .update({ phase })
    .eq("id", 1);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true };
}

// 결과(순위·점수) 공개 여부. 공개 = phase 'closed', 비공개 = 'voting'.
export async function setResultsPublic(open: boolean) {
  if (!(await requireAdmin())) return { error: "운영진만 가능합니다" };
  const admin = createAdminClient();
  const { error } = await admin
    .from("event_settings")
    .update({ phase: open ? "closed" : "voting" })
    .eq("id", 1);
  if (error) return { error: error.message };
  revalidatePath("/results");
  revalidatePath("/admin/scoring");
  revalidatePath("/");
  return { ok: true };
}

export async function setWeights(formData: FormData) {
  if (!(await requireAdmin())) return { error: "운영진만 가능합니다" };
  const judge = Number(formData.get("judge") ?? 50) / 100;
  const team = Number(formData.get("team") ?? 25) / 100;
  const audience = Number(formData.get("audience") ?? 25) / 100;
  const sum = judge + team + audience;
  if (Math.abs(sum - 1) > 0.01)
    return { error: `비율 합이 100%가 되어야 합니다 (현재 ${Math.round(sum * 100)}%)` };

  const admin = createAdminClient();
  const { error } = await admin
    .from("event_settings")
    .update({ weights: { judge, team, audience } })
    .eq("id", 1);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/results");
  return { ok: true };
}
