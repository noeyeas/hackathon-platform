import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, description, repo_url, demo_url, video_url, teams(name)")
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
            return (
              <div key={p.id} className="card flex flex-col">
                <span className="chip mb-2 w-fit">{team?.name}</span>
                <h3 className="font-bold">{p.title}</h3>
                <p className="mt-1 line-clamp-3 text-sm text-[var(--muted)]">
                  {p.description ?? "설명 없음"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {p.repo_url && (
                    <a href={p.repo_url} target="_blank" className="chip hover:text-ink">
                      GitHub
                    </a>
                  )}
                  {p.demo_url && (
                    <a href={p.demo_url} target="_blank" className="chip hover:text-ink">
                      데모
                    </a>
                  )}
                  {p.video_url && (
                    <a href={p.video_url} target="_blank" className="chip hover:text-ink">
                      영상
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
