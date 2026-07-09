"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createAnnouncement(formData: FormData) {
  if (!(await requireAdmin())) return { error: "운영진만 가능합니다" };
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const pinned = formData.get("pinned") === "on";
  if (!title) return { error: "제목을 입력하세요" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("announcements")
    .insert({ title, body: body || null, pinned });
  if (error) return { error: error.message };

  revalidatePath("/admin/announcements");
  revalidatePath("/notice");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteAnnouncement(id: string) {
  if (!(await requireAdmin())) return { error: "운영진만 가능합니다" };
  const admin = createAdminClient();
  const { error } = await admin.from("announcements").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/announcements");
  revalidatePath("/notice");
  revalidatePath("/");
  return { ok: true };
}
