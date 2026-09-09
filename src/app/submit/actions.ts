"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { safeError } from "@/lib/actionError";
import { toProjectTrack } from "@/lib/types";
import { canSubmitProject } from "@/lib/submitWindow";

// 예시 이미지(갤러리 썸네일) 업로드 제한 — 0041 의 버킷 설정과 같은 값.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
const IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function saveProject(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  // 마감 후 수정 차단. 심사가 진행되는 중에 제출물이 바뀌면 채점 근거가
  // 흔들리므로, 화면 숨김이 아니라 여기서 막아야 한다(RLS 로도 이중 방어).
  const { data: settings } = await supabase
    .from("event_settings")
    .select("submit_deadline")
    .single();
  if (!canSubmitProject(settings?.submit_deadline))
    return { error: "제출이 마감되었습니다" };

  const { data: membership } = await supabase
    .from("team_members")
    .select("team_id, is_leader")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return { error: "먼저 팀에 소속되어야 합니다" };
  if (!membership.is_leader)
    return { error: "프로젝트 제출은 팀장만 할 수 있습니다" };

  // 예시 이미지: 새 파일을 올릴 때만 교체하고, 아니면 기존 것을 유지한다
  // (수정 저장할 때마다 다시 올리게 하면 번거롭다). "삭제" 를 체크하면 비운다.
  const { data: existing } = await supabase
    .from("projects")
    .select("thumbnail_url")
    .eq("team_id", membership.team_id)
    .maybeSingle();
  let thumbnailUrl: string | null = existing?.thumbnail_url ?? null;

  if (formData.get("thumbnail_remove") === "on") thumbnailUrl = null;

  const imageFile = formData.get("thumbnail_file");
  if (imageFile instanceof File && imageFile.size > 0) {
    const ext = IMAGE_TYPES[imageFile.type];
    if (!ext)
      return { error: "예시 이미지는 PNG·JPG·WEBP·GIF 만 올릴 수 있습니다" };
    if (imageFile.size > MAX_IMAGE_BYTES)
      return { error: "예시 이미지는 5MB 이하만 가능합니다" };

    const admin = createAdminClient();
    const path = `${membership.team_id}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await admin.storage
      .from("thumbnails")
      .upload(path, imageFile, { contentType: imageFile.type, upsert: true });
    if (upErr) return { error: `이미지 업로드 실패: ${upErr.message}` };
    thumbnailUrl = admin.storage.from("thumbnails").getPublicUrl(path)
      .data.publicUrl;
  }

  const payload = {
    team_id: membership.team_id,
    thumbnail_url: thumbnailUrl,
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    // 주제는 선택 — 알 수 없는 값이 오면 미지정으로 떨어뜨린다.
    track: toProjectTrack(formData.get("track")),
    repo_url: String(formData.get("repo_url") ?? "").trim(),
    demo_url: String(formData.get("demo_url") ?? "").trim() || null,
    video_url: String(formData.get("video_url") ?? "").trim() || null,
    // 참고자료: 구글 드라이브·Notion 등 링크로 받는다 (기존 업로드 링크도 그대로 유효)
    deck_url: String(formData.get("deck_url") ?? "").trim() || null,
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
  if (payload.deck_url && !isHttp(payload.deck_url))
    return { error: "참고자료 링크는 http(s):// 로 시작해야 합니다" };

  // 팀당 1개 — upsert (team_id UNIQUE)
  const { error } = await supabase
    .from("projects")
    .upsert(payload, { onConflict: "team_id" });
  if (error)
    return { error: safeError(error, "프로젝트 저장에 실패했어요. 잠시 후 다시 시도해 주세요.") };

  revalidatePath("/submit");
  revalidatePath("/gallery");
  return { ok: true };
}
