"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { cookies, headers } from "next/headers";
import { viewerHash, clientIp } from "@/lib/viewerHash";
import { revalidatePath } from "next/cache";
import { safeError } from "@/lib/actionError";

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
    if (error)
      return { error: safeError(error, "응원 등록에 실패했어요. 잠시 후 다시 시도해 주세요.") };
  } else {
    const { error } = await admin
      .from("project_likes")
      .delete()
      .eq("project_id", projectId)
      .eq("liker_key", likerKey);
    if (error)
      return { error: safeError(error, "응원 취소에 실패했어요. 잠시 후 다시 시도해 주세요.") };
  }

  const { count } = await admin
    .from("project_likes")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId);

  revalidatePath(`/gallery/${projectId}`);
  revalidatePath("/gallery");
  return { count: count ?? 0 };
}

// 조회수 +1 — 상세 페이지 마운트 시 클라이언트에서 1회만 호출.
// (RSC 에서 렌더마다 올리면 router.refresh() 로 유령 조회가 누적되므로 분리)
//
// 남용 방지는 두 겹이다:
//  (1) 쿠키 — 같은 브라우저의 재방문을 DB 왕복 없이 걸러내는 빠른 관문
//  (2) DB  — 방문자 해시 기준 중복 판정(0034). 쿠키를 지우거나 시크릿 창을
//            써도 여기서 막힌다. 판정 주체가 쿠키가 아니라 서버여야 한다.
// RPC 실행 권한은 서버(Service Role)만(0026, 0034).
export async function pingView(projectId: string): Promise<void> {
  if (!projectId) return;

  const jar = await cookies();
  const key = `vw_${projectId}`;
  if (jar.get(key)) return; // 이 브라우저에선 이미 집계함 — DB 까지 갈 필요 없음

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const h = await headers();
  const hash = viewerHash({
    userId: user?.id,
    ip: clientIp(h),
    userAgent: h.get("user-agent"),
  });

  const admin = createAdminClient();
  await admin.rpc("count_project_view", { pid: projectId, vhash: hash });

  // 중복이라 실제로 증가하지 않았더라도 쿠키는 심는다 — 다음 방문부터
  // DB 왕복 자체를 건너뛰기 위한 캐시이지, 집계 근거가 아니다.
  jar.set(key, "1", { maxAge: 60 * 60 * 12, path: "/", sameSite: "lax" });
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

  // 레이트리밋: 최근 1분간 5개 초과면 거부 (스팸 방지)
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await supabase
    .from("project_comments")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", since);
  if ((count ?? 0) >= 5)
    return { error: "댓글을 너무 빠르게 작성했어요. 잠시 후 다시 시도해주세요." };

  const { error } = await supabase.from("project_comments").insert({
    project_id: projectId,
    user_id: user.id,
    body: text,
  });
  if (error)
    return { error: safeError(error, "댓글 등록에 실패했어요. 잠시 후 다시 시도해 주세요.") };

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

  // RLS 에 막힌 DELETE 는 에러가 아니라 0행이다. .select() 로 실제 지워진
  // 행을 확인하지 않으면 남의 댓글 삭제 시도에도 "성공"을 돌려주게 된다.
  const { data, error } = await supabase
    .from("project_comments")
    .delete()
    .eq("id", commentId)
    .select("id");
  if (error)
    return { error: safeError(error, "댓글 삭제에 실패했어요. 잠시 후 다시 시도해 주세요.") };
  if (!data?.length)
    return { error: "삭제할 권한이 없거나 이미 삭제된 댓글입니다" };

  revalidatePath(`/gallery/${projectId}`);
  return { ok: true };
}
