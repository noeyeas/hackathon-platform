"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// 발표 순서대로 정렬된 project id 목록
async function orderedProjectIds() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("projects")
    .select("id, present_order, submitted_at")
    .order("present_order", { ascending: true, nullsFirst: false })
    .order("submitted_at", { ascending: true });
  return data?.map((p) => p.id) ?? [];
}

export async function setPresenting(projectId: string | null) {
  if (!(await requireAdmin())) return { error: "운영진만 가능합니다" };
  const admin = createAdminClient();
  const { error } = await admin
    .from("event_settings")
    .update({ presenting_project_id: projectId })
    .eq("id", 1);
  if (error) return { error: error.message };
  revalidatePath("/admin/stage");
  revalidatePath("/stage");
  return { ok: true };
}

// 이전/다음 발표 팀으로 이동
export async function movePresenting(dir: "next" | "prev") {
  if (!(await requireAdmin())) return { error: "운영진만 가능합니다" };
  const admin = createAdminClient();
  const ids = await orderedProjectIds();
  if (!ids.length) return { error: "제출작이 없습니다" };

  const { data: s } = await admin
    .from("event_settings")
    .select("presenting_project_id")
    .single();

  const cur = s?.presenting_project_id
    ? ids.indexOf(s.presenting_project_id)
    : -1;
  let next: number;
  if (cur === -1) next = 0;
  else next = dir === "next" ? cur + 1 : cur - 1;
  next = Math.max(0, Math.min(ids.length - 1, next));

  return setPresenting(ids[next]);
}
