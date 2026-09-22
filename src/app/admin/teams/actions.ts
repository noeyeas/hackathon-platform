"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { adminError } from "@/lib/actionError";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// 선정된 팀을 운영진이 등록. 구글폼에서 받은 팀장 이메일을 함께 등록하면,
// 그 이메일로 로그인한 사용자가 자동으로 팀장으로 연결된다. (참가 코드 불필요)
export async function createTeamAsAdmin(formData: FormData) {
  if (!(await requireAdmin())) return { error: "운영진만 가능합니다" };
  const name = String(formData.get("name") ?? "").trim();
  const tagline = String(formData.get("tagline") ?? "").trim();
  const leaderEmail = String(formData.get("leader_email") ?? "")
    .trim()
    .toLowerCase();
  if (!name) return { error: "팀 이름을 입력하세요" };
  const teamNo = parseTeamNo(String(formData.get("team_no") ?? ""));
  if (teamNo === false) return { error: "조 번호는 1 이상 정수입니다" };

  const admin = createAdminClient();
  const { error } = await admin.from("teams").insert({
    name,
    team_no: teamNo,
    tagline: tagline || null,
    leader_email: leaderEmail || null,
  });
  if (error) return { error: adminError(error) };
  revalidatePath("/admin/teams");
  return { ok: true };
}

// 등록된 팀의 팀장 이메일 설정/수정
export async function setTeamLeaderEmail(id: string, email: string) {
  if (!(await requireAdmin())) return { error: "운영진만 가능합니다" };
  const value = email.trim().toLowerCase();
  const admin = createAdminClient();
  const { error } = await admin
    .from("teams")
    .update({ leader_email: value || null })
    .eq("id", id);
  if (error) return { error: adminError(error) };
  revalidatePath("/admin/teams");
  return { ok: true };
}

// 조 번호 설정/해제(0058). 빈 값이면 번호를 지운다. 중복이면 DB unique 가 막는다.
export async function setTeamNo(id: string, raw: string) {
  if (!(await requireAdmin())) return { error: "운영진만 가능합니다" };
  const teamNo = parseTeamNo(raw);
  if (teamNo === false) return { error: "조 번호는 1 이상 정수입니다" };
  const admin = createAdminClient();
  const { error } = await admin.from("teams").update({ team_no: teamNo }).eq("id", id);
  if (error)
    return {
      error: error.code === "23505" ? "이미 다른 팀이 쓰는 번호입니다" : adminError(error),
    };
  revalidateTeamScreens();
  return { ok: true };
}

// "" → null(번호 없음), 양의 정수 → 숫자, 그 외 → false(입력 오류)
function parseTeamNo(raw: string): number | null | false {
  const v = raw.trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 ? n : false;
}

// 조 번호·기권처럼 팀 표기가 바뀌는 변경은 팀 이름이 보이는 화면을 모두 갱신한다.
function revalidateTeamScreens() {
  for (const p of [
    "/admin/teams",
    "/admin",
    "/admin/scoring",
    "/admin/midterm",
    "/admin/audience",
    "/judge",
    "/judge/mid",
    "/vote",
    "/gallery",
    "/results",
  ])
    revalidatePath(p);
}

// 기권 처리/취소. 삭제와 달리 팀원 연결·제출물이 남고, 심사·상호평가·집계
// 대상에서만 빠진다(0056). 되돌릴 수 있다.
export async function setTeamWithdrawn(id: string, withdrawn: boolean) {
  if (!(await requireAdmin())) return { error: "운영진만 가능합니다" };
  const admin = createAdminClient();
  const { error } = await admin
    .from("teams")
    .update({ status: withdrawn ? "withdrawn" : "forming" })
    .eq("id", id);
  if (error) return { error: adminError(error) };
  revalidateTeamScreens();
  return { ok: true };
}

export async function deleteTeamAsAdmin(id: string) {
  if (!(await requireAdmin())) return { error: "운영진만 가능합니다" };
  const admin = createAdminClient();
  const { error } = await admin.from("teams").delete().eq("id", id);
  if (error) return { error: adminError(error) };
  revalidatePath("/admin/teams");
  return { ok: true };
}
