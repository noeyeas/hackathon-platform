// 전시 진출 15팀 최종 점수 — 운영진이 「2026 KW 해커톤 최종 점수 집계」 시트로 확정한 값
// (소수 셋째 자리에서 반올림한 시트 표시값). 심사 점수와 전시 주민투표는 사이트 밖에서
// 집계했으므로 rankings 뷰로는 계산할 수 없어 여기에 고정한다.
//
// 최종 = 심사 50% + 상호평가 25% + 주민투표 25%
// - 심사: 심사위원 5명 중 최고·최저점을 뺀 3명 평균(90점) + 발표·참여도(10점)
// - 상호평가: 팀 상호평가 평균(90점)을 100점으로 환산
// - 주민투표: 최다 득표 팀을 100점으로 두고 득표 비율로 환산
export type FinalScore = {
  no: number; // 조 번호
  name: string; // 시트 팀명 (DB 팀명이 없을 때만 사용)
  judge: number;
  peer: number;
  votes: number; // 3일 총 득표
  voteScore: number;
  final: number;
};

export const FINAL_SCORES: readonly FinalScore[] = [
  { no: 23, name: "경영과컴퓨터", judge: 81.33, peer: 53.23, votes: 262, voteScore: 93.57, final: 77.37 },
  { no: 13, name: "NowonLikeUs", judge: 75.67, peer: 54.69, votes: 280, voteScore: 100, final: 76.51 },
  { no: 24, name: "삼삼오오", judge: 82.67, peer: 58.78, votes: 210, voteScore: 75, final: 74.78 },
  { no: 29, name: "지단", judge: 81.0, peer: 56.8, votes: 145, voteScore: 51.79, final: 67.65 },
  { no: 4, name: "얼마Geo", judge: 78.0, peer: 56.3, votes: 152, voteScore: 54.29, final: 66.65 },
  { no: 5, name: "라스트팡", judge: 81.0, peer: 61.95, votes: 114, voteScore: 40.71, final: 66.17 },
  { no: 9, name: "월계동행", judge: 82.67, peer: 53.37, votes: 111, voteScore: 39.64, final: 64.59 },
  { no: 32, name: "월계디버깅", judge: 72.67, peer: 57.51, votes: 154, voteScore: 55, final: 64.46 },
  { no: 2, name: "솜사탕과 너구리", judge: 77.0, peer: 53.3, votes: 141, voteScore: 50.36, final: 64.41 },
  { no: 40, name: "월계획", judge: 83.33, peer: 56.67, votes: 84, voteScore: 30, final: 63.33 },
  { no: 10, name: "컴미컴", judge: 77.67, peer: 51.04, votes: 95, voteScore: 33.93, final: 60.08 },
  { no: 19, name: "월계상단", judge: 73.0, peer: 51.49, votes: 115, voteScore: 41.07, final: 59.64 },
  { no: 12, name: "우럭아왜우럭", judge: 80.0, peer: 50.87, votes: 73, voteScore: 26.07, final: 59.24 },
  { no: 34, name: "허강정", judge: 79.0, peer: 47.47, votes: 76, voteScore: 27.14, final: 58.15 },
  { no: 15, name: "복지나침반", judge: 71.67, peer: 47.57, votes: 100, voteScore: 35.71, final: 56.65 },
];

export const TOTAL_VOTES = 2112;
