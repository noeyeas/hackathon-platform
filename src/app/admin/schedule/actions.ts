"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { adminError } from "@/lib/actionError";
import { requireAdmin } from "@/lib/auth";
import { kstInputToIso } from "@/lib/format";
import { revalidatePath, updateTag } from "next/cache";

function revalidate() {
  revalidatePath("/admin/schedule");
  revalidatePath("/");
  updateTag("remote-data");
}

// ---------- 마일스톤 (여러 D-day) ----------
export async function addMilestone(formData: FormData) {
  if (!(await requireAdmin())) return { error: "운영진만 가능합니다" };
  const label = String(formData.get("label") ?? "").trim();
  const raw = String(formData.get("target_at") ?? "").trim();
  const place = String(formData.get("place") ?? "").trim() || null;
  const endRaw = String(formData.get("ends_at") ?? "").trim();
  const sort = Number(formData.get("sort") ?? 0);
  if (!label) return { error: "이름을 입력하세요 (예: 신청 마감)" };
  if (!raw) return { error: "날짜/시간을 선택하세요" };
  const targetIso = kstInputToIso(raw);
  const endIso = endRaw ? kstInputToIso(endRaw) : null;
  if (!targetIso || (endRaw && !endIso))
    return { error: "날짜/시간 형식이 올바르지 않습니다" };
  if (endIso && endIso < targetIso)
    return { error: "종료가 시작보다 빠릅니다" };

  const admin = createAdminClient();
  const { error } = await admin.from("milestones").insert({
    label,
    target_at: targetIso,
    ends_at: endIso,
    place,
    sort,
  });
  if (error) return { error: adminError(error) };
  revalidate();
  return { ok: true };
}

export async function updateMilestone(
  id: string,
  label: string,
  targetAt: string,
  place: string,
  endsAt: string
) {
  if (!(await requireAdmin())) return { error: "운영진만 가능합니다" };
  const l = label.trim();
  const raw = targetAt.trim();
  const endRaw = endsAt.trim();
  if (!l) return { error: "이름을 입력하세요" };
  if (!raw) return { error: "날짜/시간을 선택하세요" };
  const targetIso = kstInputToIso(raw);
  const endIso = endRaw ? kstInputToIso(endRaw) : null;
  if (!targetIso || (endRaw && !endIso))
    return { error: "날짜/시간 형식이 올바르지 않습니다" };
  if (endIso && endIso < targetIso)
    return { error: "종료가 시작보다 빠릅니다" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("milestones")
    .update({
      label: l,
      target_at: targetIso,
      ends_at: endIso,
      place: place.trim() || null,
    })
    .eq("id", id);
  if (error) return { error: adminError(error) };
  revalidate();
  return { ok: true };
}

export async function deleteMilestone(id: string) {
  if (!(await requireAdmin())) return { error: "운영진만 가능합니다" };
  const admin = createAdminClient();
  const { error } = await admin.from("milestones").delete().eq("id", id);
  if (error) return { error: adminError(error) };
  revalidate();
  return { ok: true };
}
