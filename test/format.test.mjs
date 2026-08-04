// 홈 타임라인 날짜 라벨(lib/format) 테스트.
// 뷰어 지역과 무관하게 항상 KST 달력 날짜로 찍혀야 한다 —
// UTC 로 읽으면 9.7 행사가 9.6 으로 보인다.
// 실행: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatMonthDay, formatMonthDayRange } from "../src/lib/format.ts";

test("formatMonthDay — KST 기준으로 M.D 를 만든다", () => {
  // 2026-09-07 12:00 KST = 2026-09-07T03:00:00Z
  assert.equal(formatMonthDay("2026-09-07T03:00:00Z"), "9.7");
  // UTC 로는 9/6 이지만 KST 로는 9/7 인 시각
  assert.equal(formatMonthDay("2026-09-06T15:00:00Z"), "9.7");
});

test("formatMonthDayRange — 같은 달이면 끝 날짜만 붙인다", () => {
  assert.equal(
    formatMonthDayRange("2026-09-18T03:00:00Z", "2026-09-19T03:00:00Z"),
    "9.18~19"
  );
});

test("formatMonthDayRange — 달을 넘기면 월까지 표기한다", () => {
  assert.equal(
    formatMonthDayRange("2026-09-30T03:00:00Z", "2026-10-01T03:00:00Z"),
    "9.30~10.1"
  );
});

test("formatMonthDayRange — 종료가 없거나 같은 날이면 단일 날짜", () => {
  assert.equal(formatMonthDayRange("2026-09-07T03:00:00Z", null), "9.7");
  assert.equal(formatMonthDayRange("2026-09-07T03:00:00Z", undefined), "9.7");
  assert.equal(
    formatMonthDayRange("2026-09-07T03:00:00Z", "2026-09-07T09:00:00Z"),
    "9.7"
  );
});
