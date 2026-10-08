import { createAdminClient } from "@/lib/supabase/server";

// 전시 진출팀(rankings.is_finalist)은 저장된 명단이 아니라 볼 때마다 1차 점수
// (심사 + 팀 상호평가)로 다시 계산된다. 주민투표가 시작된 뒤 1차 점수에 영향을
// 주는 값이 바뀌면 전시 도중에 진출팀이 바뀌고, 이미 받은 주민 표가 진출에서
// 빠진 팀에 들어간 셈이 된다.
//
// 그래서 주민투표가 열려 있거나 표가 한 장이라도 들어온 뒤에는 1차 점수에 닿는
// 입력(종이 채점표·발표·불참·가중치·팀 상호평가·기권/삭제)을 서버에서 잠근다.
// 닫았다 다시 여는 전시 기간(10.11~13) 사이 밤에도 잠금이 유지되도록 "열림"
// 만이 아니라 "표가 있는가"도 함께 본다.
export const SCORE_LOCK_MESSAGE =
  "전시 주민투표가 시작돼 진출팀 선정 점수가 잠겨 있습니다. 바꾸면 전시 도중에 진출팀이 달라집니다.";

export async function finalistsLocked(): Promise<boolean> {
  const admin = createAdminClient();
  const [{ data: settings }, { count }] = await Promise.all([
    admin
      .from("event_settings")
      .select("audience_voting_open")
      .eq("id", 1)
      .single(),
    admin
      .from("audience_votes")
      .select("ballot_code", { count: "exact", head: true }),
  ]);
  return Boolean(settings?.audience_voting_open) || (count ?? 0) > 0;
}
