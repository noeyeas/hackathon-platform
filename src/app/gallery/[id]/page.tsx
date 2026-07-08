import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LikeButton } from "@/components/LikeButton";

export const dynamic = "force-dynamic";

// YouTube URL → 임베드 주소 (아니면 null)
function youtubeEmbed(url: string): string | null {
  const m = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/
  );
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: p } = await supabase
    .from("projects")
    .select(
      "id, title, description, repo_url, demo_url, video_url, deck_url, view_count, teams(name, tagline), project_likes(count)"
    )
    .eq("id", id)
    .single();

  if (!p) notFound();

  // 조회수 +1 (원자적) — 증가된 값을 표시
  const { data: newViews } = await supabase.rpc("increment_project_view", {
    pid: id,
  });
  const views = typeof newViews === "number" ? newViews : p.view_count;

  const team = p.teams as unknown as {
    name: string;
    tagline: string | null;
  } | null;
  const likeCount =
    (p.project_likes as unknown as { count: number }[])?.[0]?.count ?? 0;

  const embed = p.video_url ? youtubeEmbed(p.video_url) : null;

  const links = [
    { url: p.repo_url, label: "GitHub", icon: "💻" },
    { url: p.demo_url, label: "데모", icon: "🔗" },
    { url: p.video_url, label: "영상", icon: "🎬" },
    { url: p.deck_url, label: "발표자료", icon: "📑" },
  ].filter((l) => l.url);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/gallery"
        className="text-sm text-[var(--muted)] hover:text-ink"
      >
        ← 갤러리로
      </Link>

      <div className="mt-4 flex flex-col gap-2">
        {team?.name && <span className="chip w-fit">{team.name}</span>}
        <h1 className="text-3xl font-bold">{p.title}</h1>
        {team?.tagline && (
          <p className="text-[var(--muted)]">{team.tagline}</p>
        )}
        <div className="mt-1 flex items-center gap-4 text-sm text-[var(--muted)]">
          <span>👁 조회 {views}</span>
          <span>♥ 응원 {likeCount}</span>
        </div>
      </div>

      {embed && (
        <div className="mt-6 aspect-video overflow-hidden rounded-2xl border border-[var(--line)]">
          <iframe
            src={embed}
            title={`${p.title} 영상`}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      <div className="card mt-6 whitespace-pre-wrap leading-relaxed">
        {p.description?.trim() || "설명이 없습니다."}
      </div>

      {links.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.url!}
              target="_blank"
              rel="noreferrer"
              className="chip hover:border-vote hover:text-vote"
            >
              <span>{l.icon}</span>
              {l.label}
            </a>
          ))}
        </div>
      )}

      <div className="mt-8 flex items-center gap-3 border-t border-[var(--line)] pt-6">
        <LikeButton projectId={p.id} initialCount={likeCount} />
        <Link href="/vote" className="btn-ghost">
          투표하러 가기
        </Link>
      </div>
    </div>
  );
}
