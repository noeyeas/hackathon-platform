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
  // 1차 점수(심사 + 팀 상호평가). 주민표는 섞이지 않는다.
  final_score: number;
  stage1_rank: number;
  is_finalist: boolean;
};

// 1차 선정 가중치 (심사 / 팀 상호). 주민(audience)은 1차 점수에 들어가지
// 않지만, 예전 설정값과 모양을 맞추려고 키는 남겨둔다.
//
// 2단계 구조라 이 두 값의 "비율"만 의미가 있다 — rankings 뷰(0040)가
// (judge + team) 으로 나눠 다시 100점으로 되돌리기 때문이다. 0.5 : 0.25 는
// 곧 2 : 1 이다.
export const SCORE_WEIGHTS = {
  judge: 0.5,
  team: 0.25,
  audience: 0.25,
} as const;

// 1차 선정 팀 수. DB 의 event_settings.finalist_count 기본값과 같아야 한다.
export const FINALIST_COUNT = 4;

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
// 시상 순서 = rankings 뷰의 표시 순서(0040).
// 1차 상위 4팀 중 주민투표 1위가 대상, 나머지 셋이 총장상이다.
export const AWARD_LABELS = ["대상", "총장상", "총장상", "총장상"] as const;

// 배지에는 짧게 쓰고, 설명이 필요한 곳에서는 기획(안)의 정식 명칭을 쓴다.
export const AWARD_FULL_LABELS = [
  "노원구청장 표창",
  "광운대학교 총장상",
  "광운대학교 총장상",
  "광운대학교 총장상",
] as const;

export const PHASE_LABEL: Record<EventPhase, string> = {
  signup: "참가 신청",
  team_building: "팀 빌딩",
  building: "개발 진행",
  submitted: "제출 마감",
  voting: "투표 진행",
  closed: "종료",
};
