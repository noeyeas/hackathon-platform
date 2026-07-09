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

function revalidate() {
  revalidatePath("/admin/schedule");
  revalidatePath("/");
}

// ---------- 마일스톤 (여러 D-day) ----------
export async function addMilestone(formData: FormData) {
  if (!(await assertAdmin())) return { error: "운영진만 가능합니다" };
  const label = String(formData.get("label") ?? "").trim();
  const raw = String(formData.get("target_at") ?? "").trim();
  const sort = Number(formData.get("sort") ?? 0);
  if (!label) return { error: "이름을 입력하세요 (예: 신청 마감)" };
  if (!raw) return { error: "날짜/시간을 선택하세요" };

  const admin = createAdminClient();
  const { error } = await admin.from("milestones").insert({
    label,
    target_at: new Date(raw).toISOString(),
    sort,
  });
  if (error) return { error: error.message };
  revalidate();
  return { ok: true };
}

export async function updateMilestone(
  id: string,
  label: string,
  targetAt: string
) {
  if (!(await assertAdmin())) return { error: "운영진만 가능합니다" };
  const l = label.trim();
  const raw = targetAt.trim();
  if (!l) return { error: "이름을 입력하세요" };
  if (!raw) return { error: "날짜/시간을 선택하세요" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("milestones")
    .update({ label: l, target_at: new Date(raw).toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidate();
  return { ok: true };
}

export async function deleteMilestone(id: string) {
  if (!(await assertAdmin())) return { error: "운영진만 가능합니다" };
  const admin = createAdminClient();
  const { error } = await admin.from("milestones").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidate();
  return { ok: true };
}

// ---------- 일정 항목 (실제 날짜+시간) ----------
export async function addScheduleItem(formData: FormData) {
  if (!(await assertAdmin())) return { error: "운영진만 가능합니다" };
  const raw = String(formData.get("starts_at") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "일정 내용을 입력하세요" };
  if (!raw) return { error: "날짜/시간을 선택하세요" };

  const detail = String(formData.get("detail") ?? "").trim() || null;
  const endRaw = String(formData.get("ends_at") ?? "").trim();

  const admin = createAdminClient();
  const { error } = await admin.from("schedule_items").insert({
    starts_at: new Date(raw).toISOString(),
    ends_at: endRaw ? new Date(endRaw).toISOString() : null,
    title,
    detail,
    sort: 0,
  });
  if (error) return { error: error.message };
  revalidate();
  return { ok: true };
}

// 일정 항목 상세(세부 일정) 수정
export async function updateScheduleDetail(id: string, detail: string) {
  if (!(await assertAdmin())) return { error: "운영진만 가능합니다" };
  const admin = createAdminClient();
  const { error } = await admin
    .from("schedule_items")
    .update({ detail: detail.trim() || null })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidate();
  return { ok: true };
}

export async function deleteScheduleItem(id: string) {
  if (!(await assertAdmin())) return { error: "운영진만 가능합니다" };
  const admin = createAdminClient();
  const { error } = await admin.from("schedule_items").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidate();
  return { ok: true };
}
