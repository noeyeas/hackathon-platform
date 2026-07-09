"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// 좋아요(응원) 등록/취소 — want=true 면 등록, false 면 취소. 멱등.
// 로그인 사용자 본인(user:<uid>)만 가능. 익명 응원은 허용하지 않는다.
export async function setLike(
  projectId: string,
  want: boolean
): Promise<{ count?: number; error?: string }> {
  if (!projectId) return { error: "잘못된 요청입니다" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  const likerKey = `user:${user.id}`;

  const admin = createAdminClient();

  if (want) {
    const { error } = await admin
      .from("project_likes")
      .upsert(
        { project_id: projectId, liker_key: likerKey },
        { onConflict: "project_id,liker_key", ignoreDuplicates: true }
      );
    if (error) return { error: error.message };
  } else {
    const { error } = await admin
      .from("project_likes")
      .delete()
      .eq("project_id", projectId)
      .eq("liker_key", likerKey);
    if (error) return { error: error.message };
  }

  const { count } = await admin
    .from("project_likes")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId);

  revalidatePath(`/gallery/${projectId}`);
  revalidatePath("/gallery");
  return { count: count ?? 0 };
}

// 댓글 작성 — 로그인 사용자 본인 명의로만 (RLS 로 강제)
export async function addComment(
  projectId: string,
  body: string
): Promise<{ ok?: true; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  const text = body.trim();
  if (!text) return { error: "내용을 입력하세요" };
  if (text.length > 1000) return { error: "1000자 이내로 입력하세요" };

  const { error } = await supabase.from("project_comments").insert({
    project_id: projectId,
    user_id: user.id,
    body: text,
  });
  if (error) return { error: error.message };

  revalidatePath(`/gallery/${projectId}`);
  return { ok: true };
}

// 댓글 삭제 — 작성자 본인 또는 운영진 (RLS 로 강제)
export async function deleteComment(
  commentId: string,
  projectId: string
): Promise<{ ok?: true; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  const { error } = await supabase
    .from("project_comments")
    .delete()
    .eq("id", commentId);
  if (error) return { error: error.message };

  revalidatePath(`/gallery/${projectId}`);
  return { ok: true };
}
