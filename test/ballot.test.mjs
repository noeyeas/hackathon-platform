// 투표권 코드 규칙 테스트.
// 코드 하나가 곧 표 3장이라, "잘못 읽어서 남의 투표권으로 통과"하는 일이
// 없어야 한다. 관대함보다 거절이 옳은 자리라는 것을 여기서 못박는다.
// 실행: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  generateBallotCode,
  normalizeBallotCode,
  BALLOT_CODE_LENGTH,
} from "../src/lib/ballot.ts";

test("generateBallotCode — 길이와 알파벳이 규칙을 지킨다", () => {
  for (let i = 0; i < 200; i++) {
    const code = generateBallotCode();
    assert.equal(code.length, BALLOT_CODE_LENGTH);
    assert.match(code, /^[23456789ABCDEFGHJKMNPRSTWXYZ]+$/, `생성된 코드: ${code}`);
  }
});

test("generateBallotCode — 헷갈리는 글자는 아예 나오지 않는다", () => {
  const codes = Array.from({ length: 500 }, () => generateBallotCode()).join("");
  for (const bad of "01ILOQUV") {
    assert.ok(!codes.includes(bad), `${bad} 가 코드에 섞이면 안 된다`);
  }
});

test("normalizeBallotCode — 대소문자·공백·하이픈만 눈감아 준다", () => {
  const code = generateBallotCode();
  assert.equal(normalizeBallotCode(code.toLowerCase()), code);
  assert.equal(normalizeBallotCode(` ${code.slice(0, 4)}-${code.slice(4)} `), code);
});

test("normalizeBallotCode — 알파벳에 없는 글자는 고쳐 읽지 않고 거절한다", () => {
  // O 를 Q 로, 1 을 J 로 "아마 이거겠지" 하고 고치면 남의 투표권을 열 수 있다.
  assert.equal(normalizeBallotCode("OOOOOOOO"), null);
  assert.equal(normalizeBallotCode("11111111"), null);
  assert.equal(normalizeBallotCode("ABCD_EFG"), null);
});

test("normalizeBallotCode — 길이가 다르거나 비면 거절한다", () => {
  assert.equal(normalizeBallotCode("ABC"), null);
  assert.equal(normalizeBallotCode(generateBallotCode() + "A"), null);
  assert.equal(normalizeBallotCode(""), null);
  assert.equal(normalizeBallotCode(null), null);
  assert.equal(normalizeBallotCode(undefined), null);
});
