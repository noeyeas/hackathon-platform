// 채점 완료 집계 공통 로직 (운영 대시보드·채점 진행 현황에서 공용).
export type ScoreRow = {
  judge_id?: string | null;
  voter_team_id?: string | null;
  project_id: string;
  criteria_id: string;
};

// 평가자별 "완료한 대상 프로젝트 집합" 계산.
// 완료 = 한 대상에 대해 채점한 기준 수가 전체 기준 수 이상.
export function completedByVoter(
  rows: ScoreRow[] | null,
  voterKey: "judge_id" | "voter_team_id",
  criteriaCount: number
): Map<string, Set<string>> {
  const filled = new Map<string, Set<string>>(); // `voter::project` → 채점한 기준들
  for (const r of rows ?? []) {
    const voter = r[voterKey];
    if (!voter) continue;
    const k = `${voter}::${r.project_id}`;
    if (!filled.has(k)) filled.set(k, new Set());
    filled.get(k)!.add(r.criteria_id);
  }
  const byVoter = new Map<string, Set<string>>(); // voter → 완료한 project 집합
  for (const [k, set] of filled) {
    if (criteriaCount === 0 || set.size < criteriaCount) continue;
    const [voter, project] = k.split("::");
    if (!byVoter.has(voter)) byVoter.set(voter, new Set());
    byVoter.get(voter)!.add(project);
  }
  return byVoter;
}
