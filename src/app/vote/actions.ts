"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// 팀 상호 투표 — 로그인한 팀원이 다른 팀 1곳에 투표
export async function castTeamVote(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  // 팀은 팀당 1표 — 리더만 대표로 투표
  const { data: membership } = await supabase
    .from("team_members")
    .select("is_leader")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return { error: "팀 소속만 투표할 수 있습니다" };
  if (!membership.is_leader)
    return { error: "팀 대표(리더)만 팀 투표를 할 수 있습니다" };

  const { error } = await supabase.from("votes").insert({
    project_id: projectId,
    voter_type: "team",
    voter_id: user.id,
  });
  if (error) return { error: friendlyError(error.message) };

  revalidatePath("/vote");
  return { ok: true };
}

// 주민 QR 투표 — 토큰 기반, 로그인 불필요 (Service Role 로 기록)
export async function castAudienceVote(token: string, projectId: string) {
  const admin = createAdminClient();

  const { data: tok } = await admin
    .from("audience_tokens")
    .select("id, votes_total, votes_used")
    .eq("token", token)
    .maybeSingle();
  if (!tok) return { error: "유효하지 않은 QR입니다" };
  if (tok.votes_used >= tok.votes_total)
    return { error: "이 QR의 표를 모두 사용했습니다" };

  const { error } = await admin.from("votes").insert({
    project_id: projectId,
    voter_type: "audience",
    voter_id: tok.id,
  });
  if (error) return { error: friendlyError(error.message) };

  revalidatePath(`/vote`);
  return { ok: true };
}

function friendlyError(msg: string): string {
  if (msg.includes("duplicate") || msg.includes("unique"))
    return "이미 이 작품에 투표했습니다";
  if (msg.includes("자기 팀")) return "자기 팀에는 투표할 수 없습니다";
  if (msg.includes("투표 기간") || msg.includes("투표가"))
    return "지금은 투표할 수 없는 시간입니다";
  return msg;
}
