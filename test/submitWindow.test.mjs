import { test } from "node:test";
import assert from "node:assert/strict";
import { canSubmitProject } from "../src/lib/submitWindow.ts";

const DEADLINE = "2026-09-19T09:00:00+09:00";

test("canSubmitProject — 마감 전이면 제출 가능", () => {
  assert.equal(
    canSubmitProject(DEADLINE, new Date("2026-09-19T08:59:00+09:00")),
    true
  );
});

test("canSubmitProject — 마감 시각을 넘기면 잠긴다", () => {
  assert.equal(
    canSubmitProject(DEADLINE, new Date("2026-09-19T09:00:01+09:00")),
    false
  );
});

// 마감이 설정되지 않은 상태에서 잠기면 대회 당일 아무도 제출할 수 없다.
test("canSubmitProject — 마감 미설정(null/undefined)이면 열어둔다", () => {
  assert.equal(canSubmitProject(null, new Date("2027-01-01T00:00:00Z")), true);
  assert.equal(canSubmitProject(undefined, new Date()), true);
});
