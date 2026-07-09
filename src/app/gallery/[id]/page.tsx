import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { LikeButton } from "@/components/LikeButton";
import { CommentForm, DeleteCommentButton } from "@/components/CommentBox";
import { TeamName } from "@/components/TeamName";

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
      "id, title, description, repo_url, demo_url, video_url, deck_url, view_count, teams(name, tagline, members_note), project_likes(count)"
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
    members_note: string | null;
  } | null;
  const likeCount =
    (p.project_likes as unknown as { count: number }[])?.[0]?.count ?? 0;

  const embed = p.video_url ? youtubeEmbed(p.video_url) : null;

  // 로그인 사용자 + 권한(운영진 여부)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let isAdmin = false;
  let likedByMe = false;
  if (user) {
    const { data: me } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    isAdmin = me?.role === "admin";

    const { data: mine } = await supabase
      .from("project_likes")
      .select("id")
      .eq("project_id", id)
      .eq("liker_key", `user:${user.id}`)
      .maybeSingle();
    likedByMe = !!mine;
  }

  // 댓글 (최신순)
  const { data: comments } = await supabase
    .from("project_comments")
    .select("id, body, created_at, user_id, users(name, avatar_url)")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  // PDF 참고자료는 화면에 임베드, 그 외(옛 링크)는 칩 링크로
  const isPdfDeck = !!p.deck_url && /\.pdf(\?|#|$)/i.test(p.deck_url);
  const links = [
    { url: p.repo_url, label: "GitHub", icon: "💻" },
    { url: p.demo_url, label: "데모", icon: "🔗" },
    { url: p.video_url, label: "영상", icon: "🎬" },
    { url: isPdfDeck ? null : p.deck_url, label: "참고자료", icon: "📑" },
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
        {team?.name && (
          <TeamName name={team.name} membersNote={team.members_note} />
        )}
        <h1 className="text-3xl font-bold">{p.title}</h1>
        {team?.tagline && (
          <p className="text-[var(--muted)]">{team.tagline}</p>
        )}
        <div className="mt-1 flex items-center gap-4 text-sm text-[var(--muted)]">
          <span>👁 조회 {views}</span>
          <span>♥ 응원 {likeCount}</span>
        </div>
      </div>

      {/* 1) 설명 */}
      <div className="card mt-6 whitespace-pre-wrap leading-relaxed">
        {p.description?.trim() || "설명이 없습니다."}
      </div>

      {/* 2) 참고자료 PDF */}
      {isPdfDeck && (
        <section className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--muted)]">
              📑 참고자료
            </h2>
            <a
              href={p.deck_url!}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-vote hover:underline"
            >
              새 탭에서 열기 ↗
            </a>
          </div>
          <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--bg)]">
            <iframe
              src={`${p.deck_url}#view=FitH`}
              title={`${p.title} 참고자료`}
              className="h-[80vh] w-full"
            />
          </div>
        </section>
      )}

      {/* 3) 영상 */}
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

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {links.length > 0 && (
          <div className="flex flex-wrap gap-2">
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
        <div className="ml-auto flex items-center gap-3">
          <LikeButton
            projectId={p.id}
            initialCount={likeCount}
            loggedIn={!!user}
            initialLiked={likedByMe}
          />
        </div>
      </div>

      {/* ===== 댓글 ===== */}
      <section className="mt-10">
        <h2 className="mb-4 text-lg font-bold">
          💬 댓글 {comments?.length ?? 0}
        </h2>

        {user ? (
          <CommentForm projectId={p.id} />
        ) : (
          <div className="card flex items-center justify-between">
            <span className="text-sm text-[var(--muted)]">
              댓글은 로그인 후 작성할 수 있어요.
            </span>
            <Link href="/login" className="btn-primary">
              로그인
            </Link>
          </div>
        )}

        <ul className="mt-6 flex flex-col gap-4">
          {!comments?.length ? (
            <li className="text-sm text-[var(--muted)]">
              아직 댓글이 없습니다. 첫 응원을 남겨보세요!
            </li>
          ) : (
            comments.map((c) => {
              const author = c.users as unknown as {
                name: string | null;
                avatar_url: string | null;
              } | null;
              const mine = user?.id === c.user_id;
              return (
                <li key={c.id} className="flex gap-3">
                  <div className="flex h-9 w-9 flex-none items-center justify-center overflow-hidden rounded-full bg-vote/10 text-sm font-bold text-vote">
                    {author?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={author.avatar_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      (author?.name ?? "익")[0]
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {author?.name ?? "익명"}
                      </span>
                      <span className="text-xs text-[var(--muted)]">
                        {formatDateTime(c.created_at)}
                      </span>
                      {(mine || isAdmin) && (
                        <span className="ml-auto">
                          <DeleteCommentButton
                            commentId={c.id}
                            projectId={p.id}
                          />
                        </span>
                      )}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                      {c.body}
                    </p>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </section>
    </div>
  );
}
