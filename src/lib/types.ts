export type UserRole = "participant" | "judge" | "admin";
export type EventPhase =
  | "signup"
  | "team_building"
  | "building"
  | "submitted"
  | "voting"
  | "closed";

export type User = {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  role: UserRole;
  tech_stack: string[];
};

export type Team = {
  id: string;
  name: string;
  tagline: string | null;
  invite_code: string;
  leader_code: string;
  status: "forming" | "locked";
  created_by: string | null;
};

export type Project = {
  id: string;
  team_id: string;
  title: string;
  description: string | null;
  repo_url: string | null;
  demo_url: string | null;
  video_url: string | null;
  deck_url: string | null;
};

export type Ranking = {
  project_id: string;
  team_id: string;
  team_name: string;
  title: string;
  judge_score: number;
  team_votes: number;
  audience_votes: number;
  final_score: number;
};

// 종합 점수 가중치 (심사 / 팀 상호 / 주민) — 합이 1이 되도록
export const SCORE_WEIGHTS = {
  judge: 0.5,
  team: 0.25,
  audience: 0.25,
} as const;

export const PHASE_LABEL: Record<EventPhase, string> = {
  signup: "참가 신청",
  team_building: "팀 빌딩",
  building: "개발 진행",
  submitted: "제출 마감",
  voting: "투표 진행",
  closed: "종료",
};
