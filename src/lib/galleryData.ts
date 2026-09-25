import { unstable_cache } from "next/cache";
import { createPublicClient, createAdminClient } from "@/lib/supabase/server";
import type { EventPhase, Ranking } from "@/lib/types";

// 갤러리 목록 데이터 — 누가 보든 같은 값이라 캐싱한다.
//
// 전시 때는 관객 수백 명이 QR 을 찍고 한꺼번에 들어온다. 캐시가 없으면
// 방문 1회마다 Supabase 왕복이 세 번씩 나가는데, 그 셋 다 방문자와 무관한
// 공용 데이터다. 30초 창을 두면 사람이 몰려도 DB 부하는 평평해진다.
//
// 무작위 정렬 시드는 방문자마다 다르므로(쿠키) 페이지에 남겨 둔다 — 여기서
// 캐싱하는 것은 정렬 전의 원본 데이터뿐이다.
//
// 조회수·응원 수는 최대 30초 늦게 반영된다. 상세 페이지는 캐시를 타지 않고
// 응원 버튼도 낙관적 갱신이라, 누른 사람 눈에는 즉시 반영된 것으로 보인다.
// 제출·기권·결과공개처럼 즉시 보여야 하는 변경은 updateTag("gallery") 로
// 곧바로 무효화한다.

export type GalleryTeam = {
  name: string;
  team_no: number | null;
  members_note: string | null;
  status: string;
};

export type GalleryProjectRow = {
  id: string;
  title: string;
  description: string | null;
  track: string | null;
  thumbnail_url: string | null;
  view_count: number | null;
  submitted_at: string;
  teams: GalleryTeam | null;
};

export const getGalleryProjects = unstable_cache(
  async () => {
    // 쿠키 없는 공개 클라이언트 — 캐시 안에서 요청 스코프를 잡지 않는다.
    const supabase = createPublicClient();
    // 응원 수는 project_likes 를 직접 세지 않고 집계 뷰에서 읽는다 —
    // 누가 눌렀는지(liker_key)를 가리느라 테이블 권한을 회수했기 때문(0036·0037).
    const [{ data: projects }, { data: settings }, { data: likeRows }] =
      await Promise.all([
        supabase
          .from("projects")
          .select(
            "id, title, description, track, thumbnail_url, view_count, submitted_at, teams(name, team_no, members_note, status)"
          ),
        supabase.from("event_settings").select("phase").single(),
        supabase.from("project_like_counts").select("project_id, likes"),
      ]);

    return {
      projects: (projects ?? []) as unknown as GalleryProjectRow[],
      phase: (settings?.phase ?? "signup") as EventPhase,
      likes: (likeRows ?? []) as { project_id: string; likes: number }[],
    };
  },
  ["gallery-projects"],
  { tags: ["gallery"], revalidate: 30 }
);

// 수상 배지용 순위. rankings 뷰는 CTE 가 여러 겹이라 이 앱에서 가장 무거운
// 쿼리인데, 결과 공개 직후가 하필 모두 동시에 새로고침하는 순간이다.
// 캐싱 효과가 가장 큰 자리라 같은 태그로 묶어 둔다.
export const getGalleryRankings = unstable_cache(
  async () => {
    // rankings 뷰는 서비스 롤 전용(0022). 뷰가 시상 순서로 정렬해 주므로
    // 여기서 따로 정렬하지 않는다.
    const { data } = await createAdminClient()
      .from("rankings")
      .select("project_id, is_finalist")
      .returns<Pick<Ranking, "project_id" | "is_finalist">[]>();
    return data ?? [];
  },
  ["gallery-rankings"],
  { tags: ["gallery"], revalidate: 30 }
);
