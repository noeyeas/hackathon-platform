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
  // 참여도 감점(불참 인원, 0052)을 뺀 뒤의 심사 점수.
  judge_score: number;
  absent_count: number;
  team_votes: number;
  audience_votes: number;
  // 진출팀은 심사 + 팀 상호평가 + 주민투표 합산 점수, 나머지는 1차 점수(0050).
  final_score: number;
  stage1_rank: number;
  is_finalist: boolean;
};

// 점수 가중치 (심사 / 팀 상호 / 주민투표). 합이 1 이어야 한다.
//
// 1차 선정(전시 진출)은 judge : team 비율만 쓴다 — rankings 뷰가
// (judge + team) 으로 나눠 다시 100점으로 되돌린다. 0.5 : 0.25 는 곧 2 : 1.
// 진출팀의 최종 점수는 세 값을 그대로 합산한다(0050). 주민표는 진출팀
// 최다 득표를 100점으로 환산한다.
export const SCORE_WEIGHTS = {
  judge: 0.5,
  team: 0.25,
  audience: 0.25,
} as const;

// 1차 선정(전시 진출) 팀 수. DB 의 event_settings.finalist_count 기본값과
// 같아야 한다(0049). 운영진이 10~15 사이에서 조정할 수 있고 상한이 기본값이다.
export const FINALIST_COUNT = 15;

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

// 제출작 주제(트랙) — 모집 공고의 5개 분야. projects.track 체크 제약과 같은 집합.
// 순서도 공고 표기 순서를 따른다(상권 → 탄소중립 → 청년·지역 상생 →
// 배리어프리 → 기타).
export type ProjectTrack =
  | "commerce"
  | "esg"
  | "youth"
  | "barrierfree"
  | "etc";

export const PROJECT_TRACKS: { value: ProjectTrack; label: string }[] = [
  { value: "commerce", label: "상권 활성화" },
  { value: "esg", label: "탄소중립·ESG" },
  { value: "youth", label: "청년·지역 상생" },
  { value: "barrierfree", label: "배리어프리·생활 편의" },
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

// 본선 심사 기준(디스코드 공지 1️⃣-2). 합계 100점. 홈·결과 페이지가 같이 쓴다.
// 참여도 5점은 심사위원 채점표(criteria 테이블, 0051)에 없고 운영진이
// 출석 확인으로 별도 반영한다(0052). 그래서 DB 의 criteria 가 아니라 이
// 상수를 안내에 쓴다 — DB 는 95점 채점표라 공지와 어긋나 보인다.
export const FINAL_CRITERIA = [
  { t: "실현 & 상용화 가능성", p: 30, d: "실제 환경에서 구현·활용될 수 있는지, 서비스·제품으로 발전할 가능성" },
  { t: "구현 완성도 & 기술력", p: 20, d: "핵심 기능의 실제 구현 여부와 활용 기술의 적절성·완성도" },
  { t: "지역 문제 적합성", p: 20, d: "지역사회 문제를 정확히 파악하고 그에 맞는 해결 방안을 제시했는지" },
  { t: "창의성 & 차별성", p: 20, d: "기존 서비스·해결방안 대비 독창성과 차별화된 특징" },
  { t: "발표", p: 5, d: "목적·주요 내용·구현 결과·기대효과를 명확하고 효과적으로 전달하는지" },
  { t: "참여도", p: 5, d: "본선 개회식(10.8 09:00)·최종발표(10.9 09:00) 필수 참여. 불참 시 인당 1점 감점 — 운영진이 출석 확인으로 반영" },
] as const;

// 상위 3팀 시상 이름 (결과 공개 후 갤러리·결과 페이지에서 공통 사용)
// 시상 순서 = rankings 뷰의 표시 순서(0040).
// 전시 진출팀(최대 15팀) 중 합산 1위가 노원구청장상, 2~4위가 광운대학교
// 총장상이다. 즉 시상은 선정 팀 수와 무관하게 언제나 4팀이다.
export const AWARD_LABELS = [
  "노원구청장상",
  "광운대학교 총장상",
  "광운대학교 총장상",
  "광운대학교 총장상",
] as const;


// 운영 콘솔에서 버튼을 늘어놓는 순서 = 대회가 실제로 흘러가는 순서.
export const PHASE_ORDER: EventPhase[] = [
  "signup",
  "team_building",
  "building",
  "submitted",
  "voting",
  "closed",
];

export const PHASE_LABEL: Record<EventPhase, string> = {
  signup: "참가 신청",
  team_building: "팀 빌딩",
  building: "개발 진행",
  submitted: "제출 마감",
  voting: "투표 진행",
  closed: "종료",
};
