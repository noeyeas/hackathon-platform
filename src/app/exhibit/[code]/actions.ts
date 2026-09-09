"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { safeError } from "@/lib/actionError";
import { normalizeBallotCode } from "@/lib/ballot";
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
    .select("code, used_at")
    .eq("code", code)
    .maybeSingle();
  if (!ballot) return { error: "유효하지 않은 투표권입니다" };
  if (ballot.used_at) return { error: "이미 사용한 투표권입니다" };

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
    .update({ used_at: new Date().toISOString() })
    .eq("code", code);

  revalidatePath(`/exhibit/${code}`);
  return { ok: true };
}
