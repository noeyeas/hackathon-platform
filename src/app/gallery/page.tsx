import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select(
      "id, title, description, view_count, teams(name), project_likes(count)"
    )
    .order("submitted_at", { ascending: true });

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">제출작 갤러리</h1>
          <p className="mt-1 text-[var(--muted)]">
            총 {projects?.length ?? 0}개 팀이 제출했습니다.
          </p>
        </div>
        <Link href="/vote" className="btn-primary">
          투표하기
        </Link>
      </div>

      {!projects?.length ? (
        <div className="card text-center text-[var(--muted)]">
          아직 제출된 작품이 없습니다.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const team = p.teams as unknown as { name: string } | null;
            const likeCount =
              (p.project_likes as unknown as { count: number }[])?.[0]?.count ??
              0;
            return (
              <Link
                key={p.id}
                href={`/gallery/${p.id}`}
                className="card flex flex-col transition hover:-translate-y-1 hover:shadow-md"
              >
                <span className="chip mb-2 w-fit">{team?.name}</span>
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
