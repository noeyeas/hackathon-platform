import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime, safeUrl } from "@/lib/format";
import { PROJECT_TRACK_LABEL, toProjectTrack } from "@/lib/types";
import { AdminPageHeader } from "../../AdminPageHeader";

export const dynamic = "force-dynamic";

// 운영진이 보는 "그 팀의 마이페이지". 참가자 /mypage 가 보여 주는 것(팀 정보 ·
// 제출물 · 작품 반응)을 그대로 읽기 전용으로 펼친다 — 문의가 오면 참가자
// 화면과 같은 걸 보면서 답해야 한다. 수정은 각 운영 화면(팀 등록·집계)에서.
export default async function AdminTeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await requireAdmin())) return null;
  const { id } = await params;

  const admin = createAdminClient();
  const { data: team } = await admin
    .from("teams")
    .select(
      "id, name, tagline, members_note, status, leader_email, created_at, presentation_score, mid_presentation_score, absent_count, team_members(is_leader, users(id, email, name, created_at))"
    )
    .eq("id", id)
    .maybeSingle();
  if (!team) notFound();

  const members = (
    (team.team_members as unknown as {
      is_leader: boolean;
      users: { id: string; email: string; name: string | null; created_at: string } | null;
    }[]) ?? []
  )
    .map((m) => ({
      email: m.users?.email ?? "",
      name: m.users?.name ?? null,
      joinedAt: m.users?.created_at ?? null,
      isLeader: m.is_leader,
    }))
    .sort((a, b) => Number(b.isLeader) - Number(a.isLeader));

  const { data: project } = await admin
    .from("projects")
    .select(
      "id, title, description, track, repo_url, demo_url, video_url, deck_url, thumbnail_url, view_count, submitted_at"
    )
    .eq("team_id", id)
    .maybeSingle();

  // 작품 반응 — 참가자 마이페이지와 같은 세 숫자.
  let likeCount = 0;
  let commentCount = 0;
  if (project) {
    const [{ data: likeRow }, { count }] = await Promise.all([
      admin
        .from("project_like_counts")
        .select("likes")
        .eq("project_id", project.id)
        .maybeSingle(),
      admin
        .from("project_comments")
        .select("id", { count: "exact", head: true })
        .eq("project_id", project.id),
    ]);
    likeCount = likeRow?.likes ?? 0;
    commentCount = count ?? 0;
  }

  const track = toProjectTrack(project?.track);
  const links = project
    ? [
        { label: "GitHub", url: project.repo_url },
        { label: "데모", url: project.demo_url },
        { label: "영상", url: project.video_url },
        { label: "자료(PDF)", url: project.deck_url },
      ].filter((l) => l.url)
    : [];

  return (
    <div className="mx-auto max-w-2xl lg:mx-0">
      <AdminPageHeader
        title={team.name}
        desc="참가자가 마이페이지에서 보는 내용을 그대로 보여 줍니다 (읽기 전용)."
        aside={
          <Link href="/admin/teams" className="btn-ghost">
            ← 팀 등록
          </Link>
        }
      />

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          {/* 팀 정보 */}
          <section className="card">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              팀 정보
            </h2>
            <dl className="mt-3 flex flex-col gap-3 text-sm">
              <Row label="한 줄 소개">{team.tagline || <Empty />}</Row>
              <Row label="팀원 구성">
                {team.members_note ? (
                  <span className="whitespace-pre-wrap">{team.members_note}</span>
                ) : (
                  <Empty />
                )}
              </Row>
              <Row label="팀장 이메일">
                <span className="select-all font-mono">
                  {team.leader_email || <Empty text="미설정" />}
                </span>
              </Row>
              <Row label="상태">
                {team.status === "withdrawn" ? (
                  <span className="chip border-alert text-alert">기권</span>
                ) : (
                  <span className="chip">{team.status === "locked" ? "잠김" : "구성 중"}</span>
                )}
              </Row>
              <Row label="등록일">{formatDateTime(team.created_at)}</Row>
            </dl>
          </section>

          {/* 로그인한 팀원 */}
          <section className="card">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              연결된 계정 ({members.length})
            </h2>
            {members.length > 0 ? (
              <ul className="mt-3 flex flex-col gap-2 text-sm">
                {members.map((m) => (
                  <li key={m.email} className="flex flex-wrap items-center gap-1.5">
                    {m.isLeader && <span className="chip border-admin text-admin">팀장</span>}
                    <span className="select-all font-mono">{m.email}</span>
                    {m.name && <span className="text-[var(--muted)]">({m.name})</span>}
                    {m.joinedAt && (
                      <span className="text-xs text-[var(--muted)]">
                        · 가입 {formatDateTime(m.joinedAt)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-[var(--muted)]">
                아직 로그인한 팀원이 없습니다. 팀장이 위 이메일로 로그인하면 자동
                연결됩니다.
              </p>
            )}
          </section>

          {/* 운영진 입력값 — 참가자에게는 보이지 않는다 */}
          <section className="card">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              운영진 입력 (참가자 비공개)
            </h2>
            <dl className="mt-3 flex flex-col gap-2 text-sm">
              <Row label="중간발표 발표 점수">{team.mid_presentation_score} / 10</Row>
              <Row label="본선 발표 점수">{team.presentation_score} / 5</Row>
              <Row label="본선 불참 인원">{team.absent_count}명</Row>
            </dl>
            <p className="mt-3 text-xs text-[var(--muted)]">
              수정은{" "}
              <Link href="/admin/midterm" className="text-navy underline">
                중간발표 심사
              </Link>
              ·{" "}
              <Link href="/admin/scoring" className="text-navy underline">
                심사 · 점수
              </Link>
              에서.
            </p>
          </section>
        </div>

        {/* 프로젝트 제출 */}
        <section className="card">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              프로젝트 제출
            </h2>
            <span
              className={`chip ${
                project ? "border-team text-team" : "border-gold text-gold-ink"
              }`}
            >
              {project ? "제출됨" : "제출 전"}
            </span>
          </div>

          {project ? (
            <div className="mt-3 flex flex-col gap-3 text-sm">
              {project.thumbnail_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={safeUrl(project.thumbnail_url)}
                  alt=""
                  className="aspect-video w-full rounded-md object-cover"
                />
              )}
              <Row label="제목">
                <span className="font-semibold">{project.title}</span>
              </Row>
              <Row label="분야">{track ? PROJECT_TRACK_LABEL[track] : <Empty text="미지정" />}</Row>
              <Row label="소개">
                {project.description ? (
                  <span className="whitespace-pre-wrap">{project.description}</span>
                ) : (
                  <Empty />
                )}
              </Row>
              <Row label="링크">
                {links.length > 0 ? (
                  <span className="flex flex-wrap gap-2">
                    {links.map((l) => (
                      <a
                        key={l.label}
                        href={safeUrl(l.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="chip hover:border-navy hover:text-navy"
                      >
                        {l.label} ↗
                      </a>
                    ))}
                  </span>
                ) : (
                  <Empty />
                )}
              </Row>
              <Row label="최근 제출">{formatDateTime(project.submitted_at)}</Row>

              <div className="mt-1 grid grid-cols-3 gap-3 border-t border-[var(--line)] pt-3">
                <Stat icon="👁" label="조회" value={project.view_count ?? 0} />
                <Stat icon="♥" label="응원" value={likeCount} />
                <Stat icon="💬" label="댓글" value={commentCount} />
              </div>

              <Link
                href={`/gallery/${project.id}`}
                className="block text-center text-sm text-[var(--muted)] hover:text-navy"
              >
                갤러리에서 보기 →
              </Link>
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--muted)]">
              아직 제출하지 않았습니다.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-2">
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

function Empty({ text = "없음" }: { text?: string }) {
  return <span className="text-[var(--muted)]">{text}</span>;
}

function Stat({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="rounded-lg bg-paper py-3 text-center">
      <div className="text-lg">{icon}</div>
      <div className="mt-0.5 text-xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-[var(--muted)]">{label}</div>
    </div>
  );
}
