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

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const contact = String(formData.get("contact") ?? "").trim();
  const positions = String(formData.get("positions") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!title) return { error: "제목을 입력하세요" };

  const { data: me } = await supabase
    .from("users")
    .select("name")
    .eq("id", user.id)
    .single();

  const kind = String(formData.get("kind") ?? (teamId ? "team" : "individual"));

  const base = {
    title,
    body: body || null,
    positions,
    is_open: true,
    author_id: user.id,
    author_name: me?.name ?? null,
  };

  let payload;
  if (kind === "team") {
    if (!teamId)
      return { error: "팀원을 모집하려면 먼저 팀을 만들어 주세요." };
    payload = { ...base, team_id: teamId, kind: "team" };
  } else {
    payload = {
      ...base,
      team_id: null,
      kind: "individual",
      contact: contact || null,
    };
  }

  const { error } = await supabase.from("recruit_posts").insert(payload);
  if (error) return { error: error.message };

  revalidatePath("/recruit");
  return { ok: true };
}

// 모집글 수정 (RLS: 팀원 또는 작성자 본인만)
export async function editRecruitPost(id: string, formData: FormData) {
  const { user, supabase } = await myTeamId();
  if (!user) return { error: "로그인이 필요합니다" };

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const contact = String(formData.get("contact") ?? "").trim();
  const positions = String(formData.get("positions") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!title) return { error: "제목을 입력하세요" };

  const { error } = await supabase
    .from("recruit_posts")
    .update({
      title,
      body: body || null,
      positions,
      contact: contact || null,
    })
    .eq("id", id);
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
