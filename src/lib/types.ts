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

// 공지 분류 — DB 의 announcements.category 체크 제약과 같은 집합을 쓴다.
export type NoticeCategory = "general" | "schedule" | "rule" | "submit";

export const NOTICE_CATEGORIES: { value: NoticeCategory; label: string }[] = [
  { value: "schedule", label: "일정" },
  { value: "rule", label: "규정" },
  { value: "submit", label: "제출" },
  { value: "general", label: "일반" },
];

export const NOTICE_CATEGORY_LABEL: Record<NoticeCategory, string> =
  Object.fromEntries(
    NOTICE_CATEGORIES.map((c) => [c.value, c.label])
  ) as Record<NoticeCategory, string>;

// 저장된 값이 알 수 없는 문자열이어도 화면이 깨지지 않도록 좁혀서 받는다.
export function toNoticeCategory(value: unknown): NoticeCategory {
  return NOTICE_CATEGORIES.some((c) => c.value === value)
    ? (value as NoticeCategory)
    : "general";
}

// 제출작 주제(트랙) — 기획(안)의 4개 분야. projects.track 체크 제약과 같은 집합.
// 순서도 기획(안) 표기 순서를 따른다(상권 → 생활안전 → 탄소중립 → 기타).
export type ProjectTrack = "commerce" | "safety" | "esg" | "etc";

export const PROJECT_TRACKS: { value: ProjectTrack; label: string }[] = [
  { value: "commerce", label: "상권 활성화" },
  { value: "safety", label: "생활안전" },
  { value: "esg", label: "탄소중립·ESG" },
  { value: "etc", label: "기타" },
];

export const PROJECT_TRACK_LABEL: Record<ProjectTrack, string> =
  Object.fromEntries(
    PROJECT_TRACKS.map((t) => [t.value, t.label])
  ) as Record<ProjectTrack, string>;

// 미지정(null)도 정상 상태라 null 을 그대로 돌려준다.
export function toProjectTrack(value: unknown): ProjectTrack | null {
  return PROJECT_TRACKS.some((t) => t.value === value)
    ? (value as ProjectTrack)
    : null;
}

// 상위 3팀 시상 이름 (결과 공개 후 갤러리·결과 페이지에서 공통 사용)
export const AWARD_LABELS = ["대상", "최우수", "우수"] as const;

export const PHASE_LABEL: Record<EventPhase, string> = {
  signup: "참가 신청",
  team_building: "팀 빌딩",
  building: "개발 진행",
  submitted: "제출 마감",
  voting: "투표 진행",
  closed: "종료",
};
