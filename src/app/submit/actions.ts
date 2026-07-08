"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveProject(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  const { data: membership } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return { error: "먼저 팀에 소속되어야 합니다" };

  const payload = {
    team_id: membership.team_id,
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    repo_url: String(formData.get("repo_url") ?? "").trim() || null,
    demo_url: String(formData.get("demo_url") ?? "").trim() || null,
    video_url: String(formData.get("video_url") ?? "").trim() || null,
    deck_url: String(formData.get("deck_url") ?? "").trim() || null,
  };
  if (!payload.title) return { error: "프로젝트 제목을 입력하세요" };

  // 팀당 1개 — upsert (team_id UNIQUE)
  const { error } = await supabase
    .from("projects")
    .upsert(payload, { onConflict: "team_id" });
  if (error) return { error: error.message };

  revalidatePath("/submit");
  revalidatePath("/gallery");
  return { ok: true };
}
