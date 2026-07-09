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

// 선정된 팀을 운영진이 등록. 팀장 코드가 자동 발급되며, 팀장에게 코드를 전달하면
// 팀장이 코드로 합류(→ 자동 팀장)해 팀 정보 관리·프로젝트 제출을 담당한다.
export async function createTeamAsAdmin(formData: FormData) {
  if (!(await assertAdmin())) return { error: "운영진만 가능합니다" };
  const name = String(formData.get("name") ?? "").trim();
  const tagline = String(formData.get("tagline") ?? "").trim();
  if (!name) return { error: "팀 이름을 입력하세요" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("teams")
    .insert({ name, tagline: tagline || null });
  if (error) return { error: error.message };
  revalidatePath("/admin/teams");
  return { ok: true };
}

export async function deleteTeamAsAdmin(id: string) {
  if (!(await assertAdmin())) return { error: "운영진만 가능합니다" };
  const admin = createAdminClient();
  const { error } = await admin.from("teams").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/teams");
  return { ok: true };
}
