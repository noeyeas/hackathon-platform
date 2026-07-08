"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// 좋아요(응원) 등록/취소 — want=true 면 등록, false 면 취소. 멱등.
// 로그인 사용자는 user:<uid>, 익명은 anon:<브라우저토큰>으로 중복 방지.
export async function setLike(
  projectId: string,
  anonKey: string,
  want: boolean
): Promise<{ count?: number; error?: string }> {
  if (!projectId) return { error: "잘못된 요청입니다" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const likerKey = user ? `user:${user.id}` : `anon:${anonKey}`;
  if (!user && !anonKey) return { error: "잘못된 요청입니다" };

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
