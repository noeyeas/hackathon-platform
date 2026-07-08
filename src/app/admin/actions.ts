"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { EventPhase } from "@/lib/types";

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  return data?.role === "admin" ? user : null;
}

export async function setPhase(phase: EventPhase) {
  if (!(await assertAdmin())) return { error: "운영진만 가능합니다" };
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

export async function setWeights(formData: FormData) {
  if (!(await assertAdmin())) return { error: "운영진만 가능합니다" };
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

// 테이블별 QR 토큰 일괄 생성 (테이블 1 ~ N)
export async function generateTableTokens(formData: FormData) {
  if (!(await assertAdmin())) return { error: "운영진만 가능합니다" };
  const count = Math.max(1, Math.min(200, Number(formData.get("count") ?? 0)));
  const votesEach = Math.max(1, Number(formData.get("votes") ?? 3));

  const { data: settings } = await createAdminClient()
    .from("event_settings")
    .select("audience_votes")
    .single();
  const votesTotal = votesEach || settings?.audience_votes || 3;

  const rows = Array.from({ length: count }, (_, i) => ({
    label: `테이블 ${i + 1}`,
    votes_total: votesTotal,
  }));

  const admin = createAdminClient();
  const { error } = await admin.from("audience_tokens").insert(rows);
  if (error) return { error: error.message };
  revalidatePath("/admin/qr");
  return { ok: true };
}
