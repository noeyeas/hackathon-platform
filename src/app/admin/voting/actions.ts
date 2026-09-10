"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { adminError } from "@/lib/actionError";
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
  if (error) return { error: adminError(error) };
  revalidatePath("/admin/scoring");
  revalidatePath("/vote");
  return { ok: true };
}
