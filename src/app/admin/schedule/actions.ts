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

// 대회 날짜 설정 (D-day 기준). datetime-local 문자열을 받음
export async function setEventDate(formData: FormData) {
  if (!(await assertAdmin())) return { error: "운영진만 가능합니다" };
  const raw = String(formData.get("event_date") ?? "").trim();
  const admin = createAdminClient();
  const { error } = await admin
    .from("event_settings")
    .update({ event_date: raw ? new Date(raw).toISOString() : null })
    .eq("id", 1);
  if (error) return { error: error.message };
  revalidate();
  return { ok: true };
}

export async function addScheduleItem(formData: FormData) {
  if (!(await assertAdmin())) return { error: "운영진만 가능합니다" };
  const time_label = String(formData.get("time_label") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const sort = Number(formData.get("sort") ?? 0);
  if (!title) return { error: "일정 내용을 입력하세요" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("schedule_items")
    .insert({ time_label: time_label || null, title, sort });
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
