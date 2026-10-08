import { cookies } from "next/headers";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { GalleryBrowser, type GalleryItem } from "./GalleryBrowser";
import { getGalleryProjects, getGalleryRankings } from "@/lib/galleryData";
import { AWARD_LABELS, toProjectTrack } from "@/lib/types";
import { teamLabel } from "@/lib/format";

// 무작위 정렬 시드를 쿠키에서 읽으므로 렌더 자체는 요청마다 일어난다.
// 다만 DB 조회는 getGalleryProjects 가 30초 캐싱하므로 왕복은 나가지 않는다.
export const dynamic = "force-dynamic";

// 문자열 해시 (결정적) — 시드+id 로 안정적인 정렬 키 생성
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export default async function GalleryPage() {
  const { projects, phase, likes } = await getGalleryProjects();

  const likesByProject = new Map<string, number>(
    likes.map((r) => [r.project_id, r.likes])
  );

  // 기권 팀은 심사·순위·집계 어디에도 들어가지 않으므로(0056) 갤러리에서도
  // 뺀다. 심사·상호평가(/vote)·운영 화면은 이미 같은 규칙이었는데
  // 갤러리만 빠져 있어, 기권한 팀이 카드와 '총 N개 팀' 집계에 남아 있었다.
  const visible = projects.filter((p) => p.teams?.status !== "withdrawn");

  // 순위(=수상)는 대회가 끝난 뒤에만 공개한다.
  const showAwards = phase === "closed";
  const rankings = showAwards ? await getGalleryRankings() : [];

  // 수상 배지는 선정된 팀에만 붙인다. 뷰가 시상 순서로 정렬해 주므로
  // (선정팀 먼저, 그 안에서 주민표 순) 걸러낸 뒤의 순번이 곧 상 순서다.
  const awardByProject = new Map<string, number>();
  rankings
    .filter((r) => r.is_finalist)
    .slice(0, AWARD_LABELS.length)
    .forEach((r, i) => {
      awardByProject.set(r.project_id, i);
    });

  // 방문(세션)당 고정된 무작위 순서 — 시드는 쿠키, 같은 시드면 항상 같은 순서.
  // 특정 팀이 항상 위에 오지 않게 하면서 새로고침·뒤로가기엔 순서 유지.
  const seed = (await cookies()).get("gallery_seed")?.value ?? "default";

  const items: GalleryItem[] = visible.map((p) => {
    const team = p.teams;
    const awardRank = awardByProject.get(p.id) ?? null;
    return {
      id: p.id,
      title: p.title,
      description: p.description,
      track: toProjectTrack(p.track),
      thumbnailUrl: p.thumbnail_url ?? null,
      teamName: team ? teamLabel(team.team_no, team.name) : "",
      membersNote: team?.members_note ?? null,
      views: p.view_count ?? 0,
      likes: likesByProject.get(p.id) ?? 0,
      // '최신순'은 마지막 수정 시각 기준 — 제출물을 고치거나 이미지를 다시
      // 올린 팀이 위로 올라온다(0064). 컬럼이 없던 시절 행은 첫 제출 시각.
      submittedAt: p.updated_at ?? p.submitted_at,
      shuffle: hash(seed + p.id),
      awardRank,
      awardLabel: awardRank === null ? null : AWARD_LABELS[awardRank],
    };
  });

  return (
    <div>
      <PageHeader
        eyebrow="Gallery"
        title="제출작 아카이브"
        desc={`총 ${items.length}개 팀의 결과물입니다.`}
      />

      <div className="mt-8">
        {items.length === 0 ? (
          <EmptyState
            icon="🖼️"
            title="아직 제출된 작품이 없습니다."
            desc="제출이 시작되면 이곳에 작품이 올라옵니다."
          />
        ) : (
          <GalleryBrowser
            items={items}
            hasAwards={showAwards && awardByProject.size > 0}
          />
        )}
      </div>
    </div>
  );
}
