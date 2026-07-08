"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function myTeamId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, teamId: null, supabase };
  const { data } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id)
    .maybeSingle();
  return { user, teamId: data?.team_id ?? null, supabase };
}

export async function createRecruitPost(formData: FormData) {
  const { user, teamId, supabase } = await myTeamId();
  if (!user) return { error: "로그인이 필요합니다" };
  if (!teamId) return { error: "먼저 팀을 만들어야 합니다" };

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const positions = String(formData.get("positions") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!title) return { error: "제목을 입력하세요" };

  const { error } = await supabase.from("recruit_posts").insert({
    team_id: teamId,
    title,
    body: body || null,
    positions,
    is_open: true,
  });
  if (error) return { error: error.message };

  revalidatePath("/recruit");
  return { ok: true };
}

export async function toggleRecruitPost(id: string, isOpen: boolean) {
  const { user, supabase } = await myTeamId();
  if (!user) return { error: "로그인이 필요합니다" };
  const { error } = await supabase
    .from("recruit_posts")
    .update({ is_open: isOpen })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/recruit");
  return { ok: true };
}

export async function deleteRecruitPost(id: string) {
  const { user, supabase } = await myTeamId();
  if (!user) return { error: "로그인이 필요합니다" };
  const { error } = await supabase.from("recruit_posts").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/recruit");
  return { ok: true };
}
