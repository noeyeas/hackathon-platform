"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  return data?.role === "admin";
}

// 투표 열림/닫힘 토글
export async function setVotingOpen(open: boolean) {
  if (!(await assertAdmin())) return { error: "운영진만 가능합니다" };
  const admin = createAdminClient();
  const { error } = await admin
    .from("event_settings")
    .update({ voting_open: open })
    .eq("id", 1);
  if (error) return { error: error.message };
  revalidatePath("/admin/voting");
  revalidatePath("/vote");
  return { ok: true };
}

// 주민 수기 득표수 저장
export async function setAudienceVotes(projectId: string, count: number) {
  if (!(await assertAdmin())) return { error: "운영진만 가능합니다" };
  const n = Math.max(0, Math.round(count) || 0);
  const admin = createAdminClient();
  const { error } = await admin
    .from("projects")
    .update({ audience_votes_manual: n })
    .eq("id", projectId);
  if (error) return { error: error.message };
  revalidatePath("/admin/voting");
  revalidatePath("/results");
  return { ok: true };
}
