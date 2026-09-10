// 0046 부터 제출 창은 마감 시각이 아니라 event_settings.project_submit_open
// 스위치 하나로 정해진다. 팀 정보 수정(teamEdit)도 같은 규칙이다.
import { test } from "node:test";
import assert from "node:assert/strict";
import { canSubmitProject } from "../src/lib/submitWindow.ts";
import { canEditTeam } from "../src/lib/teamEdit.ts";

test("canSubmitProject — 스위치가 곧 상태다", () => {
  assert.equal(canSubmitProject(true), true);
  assert.equal(canSubmitProject(false), false);
});

// 값을 못 읽었다고 잠기면 대회 당일 아무도 제출할 수 없다.
// 잠깐 더 열려 있는 쪽이 사고가 작고, 닫는 판단은 언제나 운영진이 한다.
test("canSubmitProject — 값을 못 읽었으면(null/undefined) 열어둔다", () => {
  assert.equal(canSubmitProject(null), true);
  assert.equal(canSubmitProject(undefined), true);
});

test("canEditTeam — 같은 규칙", () => {
  assert.equal(canEditTeam(true), true);
  assert.equal(canEditTeam(false), false);
  assert.equal(canEditTeam(null), true);
  assert.equal(canEditTeam(undefined), true);
});
