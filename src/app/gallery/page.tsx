import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { TeamName } from "@/components/TeamName";
import { EmptyState } from "@/components/EmptyState";

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
  const { data } = await supabase
    .from("projects")
    .select(
      "id, title, description, view_count, teams(name, members_note), project_likes(count)"
    );

  // 방문(세션)당 고정된 무작위 순서 — 시드는 쿠키, 같은 시드면 항상 같은 순서.
  // 특정 팀이 항상 위에 오지 않게 하면서 새로고침·뒤로가기엔 순서 유지.
  const seed = (await cookies()).get("gallery_seed")?.value ?? "default";
  const projects = [...(data ?? [])].sort(
    (a, b) => hash(seed + a.id) - hash(seed + b.id)
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">제출작 갤러리</h1>
        <p className="mt-1 text-[var(--muted)]">
          총 {projects?.length ?? 0}개 팀이 제출했습니다.
        </p>
      </div>

      {!projects?.length ? (
        <EmptyState
          icon="🖼️"
          title="아직 제출된 작품이 없습니다."
          desc="제출이 시작되면 이곳에 작품이 올라옵니다."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const team = p.teams as unknown as {
              name: string;
              members_note: string | null;
            } | null;
            const likeCount =
              (p.project_likes as unknown as { count: number }[])?.[0]?.count ??
              0;
            return (
              <Link
                key={p.id}
                href={`/gallery/${p.id}`}
                className="card flex flex-col transition hover:-translate-y-1 hover:shadow-md"
              >
                <TeamName
                  name={team?.name ?? ""}
                  membersNote={team?.members_note}
                  className="mb-2"
                />
                <h3 className="font-bold">{p.title}</h3>
                <p className="mt-1 line-clamp-3 text-sm text-[var(--muted)]">
                  {p.description ?? "설명 없음"}
                </p>
                <div className="mt-4 flex items-center gap-4 border-t border-[var(--line)] pt-3 text-xs text-[var(--muted)]">
                  <span>👁 {p.view_count ?? 0}</span>
                  <span>♥ {likeCount}</span>
                  <span className="ml-auto font-medium text-vote">자세히 →</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
