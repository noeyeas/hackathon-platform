"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const MAX_PDF_BYTES = 20 * 1024 * 1024; // 20MB

export async function saveProject(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  const { data: membership } = await supabase
    .from("team_members")
    .select("team_id, is_leader")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return { error: "먼저 팀에 소속되어야 합니다" };
  if (!membership.is_leader)
    return { error: "프로젝트 제출은 팀장만 할 수 있습니다" };

  // 기존 제출물 (새 파일을 안 올리면 참고자료 링크 보존)
  const { data: existing } = await supabase
    .from("projects")
    .select("deck_url")
    .eq("team_id", membership.team_id)
    .maybeSingle();
  let deckUrl: string | null = existing?.deck_url ?? null;

  // 참고자료 PDF 업로드 (새 파일이 있을 때만 교체)
  const deckFile = formData.get("deck_file");
  if (deckFile instanceof File && deckFile.size > 0) {
    if (deckFile.type !== "application/pdf") {
      return { error: "참고자료는 PDF 파일만 업로드할 수 있습니다" };
    }
    if (deckFile.size > MAX_PDF_BYTES) {
      return { error: "참고자료 파일은 20MB 이하만 가능합니다" };
    }
    const admin = createAdminClient();
    const path = `${membership.team_id}/${crypto.randomUUID()}.pdf`;
    const { error: upErr } = await admin.storage
      .from("decks")
      .upload(path, deckFile, { contentType: "application/pdf", upsert: true });
    if (upErr) return { error: `업로드 실패: ${upErr.message}` };
    deckUrl = admin.storage.from("decks").getPublicUrl(path).data.publicUrl;
  }

  const payload = {
    team_id: membership.team_id,
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    repo_url: String(formData.get("repo_url") ?? "").trim(),
    demo_url: String(formData.get("demo_url") ?? "").trim() || null,
    video_url: String(formData.get("video_url") ?? "").trim() || null,
    deck_url: deckUrl,
  };
  if (!payload.title) return { error: "프로젝트 제목을 입력하세요" };
  if (!payload.repo_url) return { error: "GitHub 저장소 링크를 입력하세요" };

  // URL 스킴 검증 — javascript:/data: 등 저장형 XSS 차단 (http/https 만 허용).
  // 클라이언트 type="url" 은 서버 액션 직접 호출로 우회되므로 서버에서 재검증.
  const isHttp = (u: string) => /^https?:\/\//i.test(u);
  if (!isHttp(payload.repo_url))
    return { error: "GitHub 링크는 http(s):// 로 시작해야 합니다" };
  if (payload.demo_url && !isHttp(payload.demo_url))
    return { error: "데모 링크는 http(s):// 로 시작해야 합니다" };
  if (payload.video_url && !isHttp(payload.video_url))
    return { error: "영상 링크는 http(s):// 로 시작해야 합니다" };

  // 팀당 1개 — upsert (team_id UNIQUE)
  const { error } = await supabase
    .from("projects")
    .upsert(payload, { onConflict: "team_id" });
  if (error) return { error: error.message };

  revalidatePath("/submit");
  revalidatePath("/gallery");
  return { ok: true };
}
