"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { adminError } from "@/lib/actionError";
import { requireAdmin } from "@/lib/auth";
import { generateBallotCode } from "@/lib/ballot";
import { revalidatePath } from "next/cache";

// 한 번에 뽑는 투표권 매수 상한. 전시 3일 규모라 이 정도면 충분하고,
// 실수로 0 을 하나 더 붙였을 때 수만 장이 생기는 것을 막는다.
export const MAX_ISSUE_AT_ONCE = 500;

// 주민투표 열림/닫힘. 참가 팀 상호평가(voting_open)와는 별개 스위치다 —
// 전시는 최종발표가 끝난 뒤에 열리므로 같이 묶으면 둘 중 하나를 반드시 잘못 연다.
export async function setAudienceVotingOpen(open: boolean) {
  if (!(await requireAdmin())) return { error: "운영진만 가능합니다" };
  const admin = createAdminClient();
  const { error } = await admin
    .from("event_settings")
    .update({ audience_voting_open: open })
    .eq("id", 1);
  if (error) return { error: adminError(error) };
  revalidatePath("/admin/audience");
  return { ok: true };
}

// 투표권 한 장의 표 수(스티커 개수). 이미 투표가 시작된 뒤 줄이면 앞사람이
// 더 많은 표를 쓴 셈이 되므로, 투표가 열려 있는 동안에는 바꾸지 못하게 한다.
export async function setVotesPerBallot(n: number) {
  if (!(await requireAdmin())) return { error: "운영진만 가능합니다" };
  const votes = Math.round(Number(n));
  if (!Number.isFinite(votes) || votes < 1 || votes > 10)
    return { error: "표 수는 1~10 사이여야 합니다" };

  const admin = createAdminClient();
  const { data: settings } = await admin
    .from("event_settings")
    .select("audience_voting_open")
    .eq("id", 1)
    .single();
  if (settings?.audience_voting_open)
    return { error: "투표를 닫은 뒤에 바꿀 수 있습니다" };

  const { error } = await admin
    .from("event_settings")
    .update({ votes_per_ballot: votes })
    .eq("id", 1);
  if (error) return { error: adminError(error) };
  revalidatePath("/admin/audience");
  return { ok: true };
}

// 투표권 발급 — 코드를 만들어 저장하고, 인쇄용으로 그대로 돌려준다.
export async function issueBallots(count: number, batch: string) {
  if (!(await requireAdmin())) return { error: "운영진만 가능합니다" };
  const n = Math.round(Number(count));
  if (!Number.isFinite(n) || n < 1)
    return { error: "발급 매수를 확인해 주세요" };
  if (n > MAX_ISSUE_AT_ONCE)
    return { error: `한 번에 ${MAX_ISSUE_AT_ONCE}장까지 발급할 수 있습니다` };

  const label = batch.trim().slice(0, 40) || null;

  // 같은 배치 안에서의 중복은 Set 으로 걸러내고, 이미 저장된 코드와 부딪히는
  // 경우는 PK 충돌로 드러난다(확률상 거의 없지만, 조용히 덜 발급되는 것보다
  // 실패로 알리는 편이 낫다 — 운영진이 다시 누르면 된다).
  const codes = new Set<string>();
  while (codes.size < n) codes.add(generateBallotCode());
  const rows = [...codes].map((code) => ({ code, batch: label }));

  const admin = createAdminClient();
  const { error } = await admin.from("audience_ballots").insert(rows);
  if (error) return { error: adminError(error) };

  revalidatePath("/admin/audience");
  return { ok: true, codes: [...codes] };
}

// 아직 아무도 쓰지 않은 배치를 통째로 취소한다. 잘못된 매수로 뽑았거나
// 시험 삼아 뽑은 장을 지우는 용도 — 이미 쓰인 표는 손대지 않는다.
export async function deleteUnusedBallots(batch: string) {
  if (!(await requireAdmin())) return { error: "운영진만 가능합니다" };
  const admin = createAdminClient();
  const query = admin.from("audience_ballots").delete().is("used_at", null);
  const { error } = batch
    ? await query.eq("batch", batch)
    : await query.is("batch", null);
  if (error) return { error: adminError(error) };
  revalidatePath("/admin/audience");
  return { ok: true };
}
