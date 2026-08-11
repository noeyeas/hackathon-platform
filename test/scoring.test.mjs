// 채점 완료 집계(lib/scoring.ts) 회귀 테스트.
// 여기서 지키려는 것은 두 가지 규칙이다.
//  1) 완료 = 모든 심사 기준을 채운 대상만. 참가자 화면과 운영 대시보드가 같은 규칙을 써야 한다.
//     (예전엔 참가자 쪽이 "기준 하나라도 채우면 완료"라서 서로 다른 숫자가 보였다)
//  2) 팀 평가 목표치는 팀마다 다르다. 제출한 팀은 자기 팀이 목록에서 빠져 n-1,
//     제출하지 않은 팀은 뺄 자기 몫이 없어 n.
// 실행: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  completedCount,
  completedByVoter,
  teamVoteTarget,
  clampScore,
} from "../src/lib/scoring.ts";

const CRITERIA = 3;

// 대상 project 에 기준 n 개를 채점한 행들
const rows = (project, n, extra = {}) =>
  Array.from({ length: n }, (_, i) => ({
    project_id: project,
    criteria_id: `c${i + 1}`,
    ...extra,
  }));

test("completedCount — 모든 기준을 채운 대상만 완료로 센다", () => {
  const partial = rows("p1", 2); // 3개 중 2개만
  const full = rows("p2", 3);
  assert.equal(completedCount([...partial, ...full], CRITERIA), 1);
});

test("completedCount — 같은 기준을 중복 저장해도 완료로 치지 않는다", () => {
  const dup = [
    { project_id: "p1", criteria_id: "c1" },
    { project_id: "p1", criteria_id: "c1" },
    { project_id: "p1", criteria_id: "c2" },
  ];
  assert.equal(completedCount(dup, CRITERIA), 0);
});

test("completedCount — 빈 입력·기준 0개는 0", () => {
  assert.equal(completedCount(null, CRITERIA), 0);
  assert.equal(completedCount(rows("p1", 3), 0), 0);
});

test("completedByVoter — 평가자별로 같은 완료 규칙을 적용한다", () => {
  const scores = [
    ...rows("p1", 3, { judge_id: "j1" }), // 완료
    ...rows("p2", 1, { judge_id: "j1" }), // 미완료
    ...rows("p1", 3, { judge_id: "j2" }), // 완료
    ...rows("p2", 3, { judge_id: "j2" }), // 완료
  ];
  const byVoter = completedByVoter(scores, "judge_id", CRITERIA);
  assert.equal(byVoter.get("j1").size, 1);
  assert.equal(byVoter.get("j2").size, 2);
});

test("completedByVoter — voter 가 비어 있는 행은 무시한다", () => {
  const scores = [
    ...rows("p1", 3, { voter_team_id: null }),
    ...rows("p1", 3, { voter_team_id: "t1" }),
  ];
  const byVoter = completedByVoter(scores, "voter_team_id", CRITERIA);
  assert.equal(byVoter.size, 1);
  assert.equal(byVoter.get("t1").size, 1);
});

test("참가자 화면과 운영 대시보드의 숫자가 일치한다", () => {
  // 같은 원본 데이터를 두 경로로 집계했을 때 결과가 같아야 한다.
  const scores = [
    ...rows("p1", 3, { voter_team_id: "t1" }),
    ...rows("p2", 2, { voter_team_id: "t1" }),
    ...rows("p3", 3, { voter_team_id: "t1" }),
  ];
  const mine = completedCount(scores, CRITERIA); // vote/page.tsx 가 쓰는 경로
  const admin = completedByVoter(scores, "voter_team_id", CRITERIA).get("t1").size;
  assert.equal(mine, admin);
  assert.equal(mine, 2);
});

test("teamVoteTarget — 제출한 팀은 n-1, 미제출 팀은 n", () => {
  assert.equal(teamVoteTarget(13, true), 12);
  assert.equal(teamVoteTarget(13, false), 13);
});

test("teamVoteTarget — 제출작이 없거나 하나뿐이면 음수가 되지 않는다", () => {
  assert.equal(teamVoteTarget(0, false), 0);
  assert.equal(teamVoteTarget(1, true), 0);
});

// ---------------------------------------------------------------
// clampScore — 폼 값 한 칸을 0~max 정수로 다듬는다.
// 지키려는 것: 숫자가 아닌 입력이 NaN 인 채로 빠져나가지 않는 것.
// Math.max(0, NaN) 이 0 이 아니라 NaN 이라, 클램핑만으로는 막히지 않았다.
// NaN 은 JSON 에서 null 로 나가 NOT NULL 위반이 되고, 한 칸 때문에
// 그 팀 점수 저장 전체가 실패했다.
// ---------------------------------------------------------------
test("clampScore — 정상 입력은 그대로", () => {
  assert.equal(clampScore("7", 10), 7);
  assert.equal(clampScore(3, 10), 3);
});

test("clampScore — 범위를 벗어나면 0~max 로 자른다", () => {
  assert.equal(clampScore("999", 10), 10);
  assert.equal(clampScore("-5", 10), 0);
});

test("clampScore — 소수는 반올림한다", () => {
  assert.equal(clampScore("7.6", 10), 8);
  assert.equal(clampScore("7.4", 10), 7);
});

test("clampScore — 빈 값과 누락은 0", () => {
  assert.equal(clampScore("", 10), 0);
  assert.equal(clampScore(null, 10), 0);
  assert.equal(clampScore(undefined, 10), 0);
});

test("clampScore — 숫자가 아닌 입력도 항상 유한한 정수를 낸다", () => {
  for (const bad of ["abc", "1,2", {}, [1, 2], "NaN"]) {
    const v = clampScore(bad, 10);
    assert.ok(
      Number.isFinite(v),
      `${JSON.stringify(bad)} → ${v} (NaN 이 새어나가면 저장 전체가 실패한다)`
    );
    assert.equal(v, 0);
  }
});
