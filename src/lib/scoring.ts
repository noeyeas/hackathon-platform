// 채점 완료 집계 공통 로직.
// 운영 대시보드·채점 진행 현황·참가자 진행률이 모두 이 파일의 규칙을 쓴다.
//
// 완료 기준(한 곳에서만 정의): 한 대상 프로젝트의 심사 기준을 "모두" 채점해야 완료.
// 화면마다 기준이 갈리면 참가자는 "다 했다", 운영진은 "미완료"로 보이게 된다.
export type ScoreRow = {
  judge_id?: string | null;
  voter_team_id?: string | null;
  project_id: string;
  criteria_id: string;
};

type ProjectCriteriaRow = { project_id: string; criteria_id: string };

// 한 평가자의 채점 행에서 모든 기준을 채운 대상 프로젝트 집합.
function completedProjects(
  rows: ProjectCriteriaRow[],
  criteriaCount: number
): Set<string> {
  const done = new Set<string>();
  if (criteriaCount === 0) return done;

  const byProject = new Map<string, Set<string>>(); // project → 채점한 기준들
  for (const r of rows) {
    if (!byProject.has(r.project_id)) byProject.set(r.project_id, new Set());
    byProject.get(r.project_id)!.add(r.criteria_id);
  }
  for (const [project, set] of byProject) {
    if (set.size >= criteriaCount) done.add(project);
  }
  return done;
}

// 본인 화면용 — 내가 완료한 대상 수 (심사 채점·팀별 채점 진행률 바).
export function completedCount(
  rows: ProjectCriteriaRow[] | null,
  criteriaCount: number
): number {
  return completedProjects(rows ?? [], criteriaCount).size;
}

// 운영 화면용 — 평가자별 완료한 대상 프로젝트 집합.
export function completedByVoter(
  rows: ScoreRow[] | null,
  voterKey: "judge_id" | "voter_team_id",
  criteriaCount: number
): Map<string, Set<string>> {
  const byVoter = new Map<string, ProjectCriteriaRow[]>();
  for (const r of rows ?? []) {
    const voter = r[voterKey];
    if (!voter) continue;
    if (!byVoter.has(voter)) byVoter.set(voter, []);
    byVoter.get(voter)!.push(r);
  }

  const result = new Map<string, Set<string>>();
  for (const [voter, voterRows] of byVoter) {
    result.set(voter, completedProjects(voterRows, criteriaCount));
  }
  return result;
}

// 폼으로 들어온 점수 한 칸을 0~max 정수로 다듬는다. 심사 채점과 팀 평가가
// 같은 규칙을 쓴다.
//
// 클램핑만으로는 부족하다 — Math.max(0, NaN) 은 0 이 아니라 NaN 이라
// 숫자가 아닌 입력이 그대로 빠져나간다. NaN 은 JSON 에서 null 로 나가
// NOT NULL 위반이 되고, 그 한 칸 때문에 팀 점수 저장 전체가 실패한다.
export function clampScore(raw: unknown, maxScore: number): number {
  const n = Number(raw ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(maxScore, Math.round(n)));
}

// 한 팀이 평가해야 할 대상 수.
// 자기 팀은 목록에서 빠지므로 제출한 팀은 하나가 줄지만,
// 제출하지 않은 팀은 뺄 자기 몫이 없어 목표가 그대로다.
export function teamVoteTarget(
  submittedCount: number,
  teamHasSubmitted: boolean
): number {
  return Math.max(0, submittedCount - (teamHasSubmitted ? 1 : 0));
}
