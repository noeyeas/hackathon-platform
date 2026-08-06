import { cookies } from "next/headers";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { GalleryBrowser, type GalleryItem } from "./GalleryBrowser";
import { AWARD_LABELS, toProjectTrack, type EventPhase, type Ranking } from "@/lib/types";

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
  const supabase = await createClient();
  const [{ data }, { data: settings }] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "id, title, description, track, view_count, submitted_at, teams(name, members_note), project_likes(count)"
      ),
    supabase.from("event_settings").select("phase").single(),
  ]);

  // 순위(=수상)는 대회가 끝난 뒤에만 공개한다. rankings 뷰는 서비스 롤 전용(0022).
  const showAwards = ((settings?.phase ?? "signup") as EventPhase) === "closed";
  const { data: rankings } = showAwards
    ? await createAdminClient().from("rankings").select("*").returns<Ranking[]>()
    : { data: null as Ranking[] | null };

  const awardByProject = new Map<string, number>();
  (rankings ?? []).slice(0, AWARD_LABELS.length).forEach((r, i) => {
    awardByProject.set(r.project_id, i);
  });

  // 방문(세션)당 고정된 무작위 순서 — 시드는 쿠키, 같은 시드면 항상 같은 순서.
  // 특정 팀이 항상 위에 오지 않게 하면서 새로고침·뒤로가기엔 순서 유지.
  const seed = (await cookies()).get("gallery_seed")?.value ?? "default";

  const items: GalleryItem[] = (data ?? []).map((p) => {
    const team = p.teams as unknown as {
      name: string;
      members_note: string | null;
    } | null;
    const awardRank = awardByProject.get(p.id) ?? null;
    return {
      id: p.id,
      title: p.title,
      description: p.description,
      track: toProjectTrack(p.track),
      teamName: team?.name ?? "",
      membersNote: team?.members_note ?? null,
      views: p.view_count ?? 0,
      likes:
        (p.project_likes as unknown as { count: number }[])?.[0]?.count ?? 0,
      submittedAt: p.submitted_at,
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
