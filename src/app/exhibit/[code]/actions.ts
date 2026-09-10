"use server";

import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";
import { safeError } from "@/lib/actionError";
import {
  normalizeBallotCode,
  DEVICE_COOKIE,
  DEVICE_COOKIE_MAX_AGE,
} from "@/lib/ballot";
import { type Ranking } from "@/lib/types";
import { revalidatePath } from "next/cache";

// 주민 한 사람(투표권 한 장)의 표를 저장한다.
//
// 로그인이 없는 경로라 anon 키로는 아무것도 못 하게 막아 두고(0045) 전부
// Service Role 로 처리한다. 그래서 "이 코드가 진짜 발급된 것인가"를 여기서
// 반드시 확인해야 한다 — URL 을 지어내도 통과하면 안 된다.
export async function castAudienceVotes(rawCode: string, projectIds: string[]) {
  const code = normalizeBallotCode(rawCode);
  if (!code) return { error: "유효하지 않은 투표권입니다" };

  const admin = createAdminClient();

  const { data: settings } = await admin
    .from("event_settings")
    .select("audience_voting_open, votes_per_ballot")
    .eq("id", 1)
    .single();
  if (!settings?.audience_voting_open)
    return { error: "지금은 주민투표 기간이 아닙니다" };
  const perBallot = settings.votes_per_ballot ?? 3;

  const { data: ballot } = await admin
    .from("audience_ballots")
    .select("code, used_at, allow_shared_device")
    .eq("code", code)
    .maybeSingle();
  if (!ballot) return { error: "유효하지 않은 투표권입니다" };
  if (ballot.used_at) return { error: "이미 사용한 투표권입니다" };

  // 이 폰이 이미 다른 투표권으로 투표했는지 본다(0048). 투표권 두 장을
  // 집어가도 한 사람은 한 번만 투표하게 하려는 것이다.
  // 안내데스크가 확인하고 내준 예외 투표권은 이 검사를 건너뛴다(0048).
  const jar = await cookies();
  const deviceId = jar.get(DEVICE_COOKIE)?.value ?? crypto.randomUUID();
  const { data: priorUse } = ballot.allow_shared_device
    ? { data: [] as { code: string }[] }
    : await admin
    .from("audience_ballots")
    .select("code")
    .eq("device_id", deviceId)
    .not("used_at", "is", null)
    .neq("code", code)
    .limit(1);
  if (priorUse && priorUse.length > 0)
    return {
      error:
        "이 기기에서는 이미 투표하셨습니다. 투표권은 한 분당 한 장입니다.",
    };

  // 같은 팀을 여러 번 고른 것은 한 표로 친다(스티커를 몰아 붙일 수 없듯이).
  const picks = [...new Set(projectIds.filter(Boolean))];
  if (picks.length === 0) return { error: "팀을 하나 이상 골라 주세요" };
  if (picks.length > perBallot)
    return { error: `최대 ${perBallot}팀까지 고를 수 있습니다` };

  // 전시 진출팀에만 투표할 수 있다. 화면이 진출팀만 보여주지만, 화면에
  // 안 그리는 것으로는 아무것도 막지 못하므로 여기서 다시 확인한다.
  const { data: rankings } = await admin
    .from("rankings")
    .select("project_id, is_finalist")
    .returns<Pick<Ranking, "project_id" | "is_finalist">[]>();
  const finalists = new Set(
    (rankings ?? []).filter((r) => r.is_finalist).map((r) => r.project_id)
  );
  if (picks.some((id) => !finalists.has(id)))
    return { error: "전시 진출팀에만 투표할 수 있습니다" };

  const { error } = await admin
    .from("audience_votes")
    .insert(picks.map((id) => ({ ballot_code: code, project_id: id })));
  if (error)
    return {
      error: safeError(error, "투표 저장에 실패했어요. 잠시 후 다시 시도해 주세요."),
    };

  // 표가 들어간 뒤에 투표권을 닫는다. 순서를 뒤집으면 저장에 실패했을 때
  // 투표권만 태워 버리게 된다. 표 수 상한은 DB 트리거가 따로 지킨다(0045).
  await admin
    .from("audience_ballots")
    .update({ used_at: new Date().toISOString(), device_id: deviceId })
    .eq("code", code);

  // 기기 표시는 투표가 실제로 반영된 뒤에만 남긴다. 먼저 심었다가 저장이
  // 실패하면, 아직 한 번도 투표하지 못한 사람의 폰이 잠겨 버린다.
  jar.set(DEVICE_COOKIE, deviceId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: DEVICE_COOKIE_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });

  revalidatePath(`/exhibit/${code}`);
  return { ok: true };
}
