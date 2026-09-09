// 홈 타임라인 날짜 라벨(lib/format) 테스트.
// 뷰어 지역과 무관하게 항상 KST 달력 날짜로 찍혀야 한다 —
// UTC 로 읽으면 9.7 행사가 9.6 으로 보인다.
// 실행: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatMonthDay,
  formatMonthDayRange,
  formatMonthDayWeekdayRange,
  toKstInput,
  kstInputToIso,
} from "../src/lib/format.ts";

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

// 포스터 섹션 '한눈에 보기'/FAQ 는 사람이 달력에 옮겨 적는 목록이라
// 요일이 붙는다. 요일도 KST 기준이어야 한다(UTC 로 읽으면 하루 밀린다).
test("formatMonthDayWeekdayRange — 요일까지 KST 로 찍는다", () => {
  // 2026-10-08(목) 09:00 KST ~ 2026-10-09(금)
  assert.equal(
    formatMonthDayWeekdayRange("2026-10-08T00:00:00Z", "2026-10-09T00:00:00Z"),
    "10.8(목) – 10.9(금)"
  );
});

test("formatMonthDayWeekdayRange — 하루짜리는 한 번만 찍는다", () => {
  assert.equal(formatMonthDayWeekdayRange("2026-09-16T03:00:00Z", null), "9.16(수)");
  // 시작·종료가 같은 날이면 범위로 벌리지 않는다
  assert.equal(
    formatMonthDayWeekdayRange("2026-09-16T03:00:00Z", "2026-09-16T09:00:00Z"),
    "9.16(수)"
  );
});

// 관리자 일정 입력의 왕복(입력칸 ← DB, DB ← 입력칸)은 반드시 KST 고정이어야
// 한다. 런타임 로컬 시간대로 읽으면 브라우저(KST)와 Vercel 서버(UTC)가 9시간
// 어긋나 저장할 때마다 시각이 밀린다. 이 테스트가 그 회귀를 막는다.
test("toKstInput — 뷰어/서버 시간대와 무관하게 KST 벽시계를 찍는다", () => {
  // 2026-10-08T05:00:00Z = 2026-10-08 14:00 KST
  assert.equal(toKstInput("2026-10-08T05:00:00Z"), "2026-10-08T14:00");
  // 자정 넘김: 2026-10-08T15:30:00Z = 2026-10-09 00:30 KST (h23 이라 24시 아님)
  assert.equal(toKstInput("2026-10-08T15:30:00Z"), "2026-10-09T00:30");
  assert.equal(toKstInput(null), "");
  assert.equal(toKstInput("나쁜값"), "");
});

test("kstInputToIso — 시간대 없는 입력값을 KST 로 읽는다", () => {
  assert.equal(kstInputToIso("2026-10-08T14:00"), "2026-10-08T05:00:00.000Z");
  assert.equal(kstInputToIso("2026-10-09T00:30"), "2026-10-08T15:30:00.000Z");
  assert.equal(kstInputToIso("이상한값"), null);
  assert.equal(kstInputToIso(""), null);
});

test("KST 입력 왕복은 값을 바꾸지 않는다 (저장할 때마다 밀리는 버그)", () => {
  for (const wall of ["2026-10-08T14:00", "2026-10-09T00:30", "2026-01-01T09:00"]) {
    assert.equal(toKstInput(kstInputToIso(wall)), wall);
  }
});
