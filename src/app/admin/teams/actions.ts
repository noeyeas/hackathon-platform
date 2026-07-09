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

// 선정된 팀을 운영진이 등록. 구글폼에서 받은 팀장 이메일을 함께 등록하면,
// 그 이메일로 로그인한 사용자가 자동으로 팀장으로 연결된다. (참가 코드 불필요)
export async function createTeamAsAdmin(formData: FormData) {
  if (!(await assertAdmin())) return { error: "운영진만 가능합니다" };
  const name = String(formData.get("name") ?? "").trim();
  const tagline = String(formData.get("tagline") ?? "").trim();
  const leaderEmail = String(formData.get("leader_email") ?? "")
    .trim()
    .toLowerCase();
  if (!name) return { error: "팀 이름을 입력하세요" };

  const admin = createAdminClient();
  const { error } = await admin.from("teams").insert({
    name,
    tagline: tagline || null,
    leader_email: leaderEmail || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/teams");
  return { ok: true };
}

// 등록된 팀의 팀장 이메일 설정/수정
export async function setTeamLeaderEmail(id: string, email: string) {
  if (!(await assertAdmin())) return { error: "운영진만 가능합니다" };
  const value = email.trim().toLowerCase();
  const admin = createAdminClient();
  const { error } = await admin
    .from("teams")
    .update({ leader_email: value || null })
    .eq("id", id);
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
