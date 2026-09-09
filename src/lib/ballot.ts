// 전시장 주민투표 투표권(QR) 코드 규칙.
//
// 코드는 전시장에서 종이로 나눠주는 물건이라, QR 이 안 찍히는 폰에서는 손으로
// 옮겨 칠 수도 있어야 한다. 그래서 사람이 헷갈리는 글자(0/O, 1/I/L, U/V)를
// 애초에 알파벳에서 빼고 대문자만 쓴다.
//
// 뺀 글자를 입력받았을 때 "아마 이걸 잘못 본 것"이라고 고쳐 읽지는 않는다.
// 잘못 고치면 남의 투표권으로 조용히 투표해 버릴 수 있고, 그건 "유효하지 않은
// 투표권입니다" 보다 훨씬 나쁜 결과다.
const ALPHABET = "23456789ABCDEFGHJKMNPRSTWXYZ"; // 28자 (0·1·I·L·O·Q·U·V 제외)
export const BALLOT_CODE_LENGTH = 8;

// 8자 × 28 = 약 3.8×10^11 가지. 수천 장을 발급해도 남의 코드를 찍어 맞힐
// 확률은 사실상 0 이고, 그마저도 발급된 코드만 유효하다.
export function generateBallotCode(
  random: () => number = Math.random
): string {
  let out = "";
  for (let i = 0; i < BALLOT_CODE_LENGTH; i++) {
    out += ALPHABET[Math.floor(random() * ALPHABET.length)];
  }
  return out;
}

// URL·수기 입력으로 들어온 코드를 저장된 형태로 맞춘다.
// 소문자로 찍거나 하이픈·공백을 끼워 넣는 정도만 받아주고, 그 밖에는 거른다.
export function normalizeBallotCode(
  raw: string | null | undefined
): string | null {
  if (!raw) return null;
  const cleaned = raw.toUpperCase().replace(/[\s-]/g, "");
  if (cleaned.length !== BALLOT_CODE_LENGTH) return null;
  return [...cleaned].every((c) => ALPHABET.includes(c)) ? cleaned : null;
}
