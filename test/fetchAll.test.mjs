// fetchAll(lib/fetchAll.ts) — PostgREST 1,000행 상한을 넘겨 끝까지 읽는지 확인.
// 실행: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchAll } from "../src/lib/fetchAll.ts";

// rows 배열을 range(from,to) 로 잘라 주는 가짜 쿼리
const fake = (rows, calls) => () => ({
  range: async (from, to) => {
    calls.push([from, to]);
    return { data: rows.slice(from, to + 1), error: null };
  },
});

test("페이지 크기를 넘는 행을 모두 모은다", async () => {
  const rows = Array.from({ length: 2500 }, (_, i) => ({ i }));
  const calls = [];
  const { data, error } = await fetchAll(fake(rows, calls), 1000);
  assert.equal(error, null);
  assert.equal(data.length, 2500);
  assert.deepEqual(data.at(-1), { i: 2499 });
  assert.deepEqual(calls, [[0, 999], [1000, 1999], [2000, 2999]]);
});

test("정확히 페이지 배수여도 누락 없이 끝난다", async () => {
  const rows = Array.from({ length: 2000 }, (_, i) => ({ i }));
  const calls = [];
  const { data } = await fetchAll(fake(rows, calls), 1000);
  assert.equal(data.length, 2000);
  assert.equal(calls.length, 3); // 마지막 빈 페이지 한 번 더 확인
});

test("빈 테이블은 빈 배열", async () => {
  const { data } = await fetchAll(fake([], []), 1000);
  assert.deepEqual(data, []);
});

test("에러는 그대로 넘긴다", async () => {
  const { data, error } = await fetchAll(() => ({
    range: async () => ({ data: null, error: { message: "boom" } }),
  }));
  assert.equal(data, null);
  assert.equal(error.message, "boom");
});
