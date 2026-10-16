import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { teamLabel } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { getGalleryProjects, type GalleryProjectRow } from "@/lib/galleryData";
import { AWARD_LABELS } from "@/lib/types";
import { MANYFAST_AWARD_TEAM_NUMBER } from "@/lib/awards";
import { FINAL_SCORES, TOTAL_VOTES } from "@/lib/finalScores";

export const dynamic = "force-dynamic";

// 결과 페이지 — 수상팀과 전시 진출 15팀의 최종 점수·순위를 보여 준다.
// 대회 종료(phase 'closed') 뒤에만 공개하고, 운영진은 미리 볼 수 있다.
// 점수는 사이트 밖 집계 시트로 확정한 값(lib/finalScores)을 따른다.
// 상단 수상 카드에는 점수를 넣지 않고 소개만, 점수는 아래 순위표에서 보여 준다.
const fmt = (n: number) => n.toFixed(2);

export default async function ResultsPage() {
  const supabase = await createClient();

  const [
    { projects, phase },
    {
      data: { user },
    },
  ] = await Promise.all([getGalleryProjects(), supabase.auth.getUser()]);

  const showFinal = phase === "closed";

  let isAdmin = false;
  if (user) {
    const { data: me } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    isAdmin = me?.role === "admin";
  }
  const canSeeWinners = showFinal || isAdmin;

  const byTeamNo = new Map<number, GalleryProjectRow>();
  for (const p of projects) {
    const no = p.teams?.team_no;
    if (no != null && p.teams?.status !== "withdrawn") byTeamNo.set(no, p);
  }

  const rows = [...FINAL_SCORES]
    .sort((a, b) => b.final - a.final)
    .map((r, i) => ({
      ...r,
      rank: i + 1,
      project: byTeamNo.get(r.no) ?? null,
      award: i < AWARD_LABELS.length ? (AWARD_LABELS[i] as string) : null,
    }));
  type Row = (typeof rows)[number];
  const nameOf = (r: Row) => teamLabel(r.no, r.project?.teams?.name ?? r.name);
  const [grand, ...others] = rows.slice(0, AWARD_LABELS.length);
  const manyfast = byTeamNo.get(MANYFAST_AWARD_TEAM_NUMBER) ?? null;
  const topVotes = Math.max(...rows.map((r) => r.votes));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow={showFinal ? "Final Result" : "Result"}
        title={showFinal ? "최종 결과" : "결과 발표"}
        desc={
          showFinal
            ? "2026 광운대학교 KW 해커톤 수상팀과 최종 순위를 소개합니다. 함께해 주신 모든 분께 감사드립니다."
            : "수상팀은 대회가 모두 끝난 뒤 이곳에 공개됩니다."
        }
      />

      {isAdmin && !showFinal && (
        <p className="mt-5 rounded-md border border-admin/20 bg-admin/[0.06] px-4 py-3 text-sm text-admin">
          운영자 미리보기입니다. 참가자·관객에게는 결과 공개 전까지 수상팀이
          보이지 않습니다.
        </p>
      )}

      {canSeeWinners ? (
        <>
          {/* ── 노원구청장상 ── */}
          <section className="relative isolate mt-8 overflow-hidden rounded-lg bg-navy px-6 py-8 text-white sm:px-8 sm:py-10">
            {/* 오른쪽에 팀 갤러리 이미지 — 왼쪽 글자 쪽으로 남색 그라데이션이 번지게 */}
            {grand.project?.thumbnail_url && (
              <div
                aria-hidden="true"
                className="absolute inset-0 -z-10 sm:left-auto sm:w-[55%]"
              >
                <Image
                  src={grand.project.thumbnail_url}
                  alt=""
                  fill
                  priority
                  sizes="(min-width: 640px) 480px, 100vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-navy/85 sm:bg-transparent sm:bg-gradient-to-r sm:from-navy sm:via-navy/60 sm:via-40% sm:to-transparent" />
              </div>
            )}
            <div className={grand.project?.thumbnail_url ? "sm:max-w-[50%]" : ""}>
              <p className="eyebrow !text-gold-bright">🥇 {grand.award}</p>
              <h2 className="mt-3 font-title text-3xl font-bold leading-tight sm:text-4xl">
                {grand.project?.title ?? nameOf(grand)}
              </h2>
              <p className="mt-1 font-title text-xl font-medium text-white/60">
                {nameOf(grand)}
              </p>
              {grand.project?.description && (
                <p className="mt-5 max-w-xl whitespace-pre-wrap text-sm leading-relaxed text-white/75">
                  {grand.project.description}
                </p>
              )}
              {grand.project && (
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href={`/gallery/${grand.project.id}`} className="btn-gold">
                    제출작 보기
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* ── 광운대학교 총장상 ── */}
          <section className="mt-6 grid gap-4 sm:grid-cols-3">
            {others.map((r) => (
              <div key={r.no} className="card flex h-full flex-col gap-1">
                <span className="badge-navy self-start">🥈 {r.award}</span>
                <h3 className="mt-2 font-bold leading-snug">
                  {r.project?.title ?? nameOf(r)}
                </h3>
                <p className="text-sm text-[var(--muted)]">{nameOf(r)}</p>
                {r.project && (
                  <Link
                    href={`/gallery/${r.project.id}`}
                    className="mt-auto pt-3 text-sm font-semibold text-navy hover:underline"
                  >
                    제출작 보기 →
                  </Link>
                )}
              </div>
            ))}
          </section>

          {/* ── 매니패스트상 (중간발표) ── */}
          <section className="card mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
            <b className="font-semibold">🎁 매니패스트상 · 중간발표</b>
            <span className="text-[var(--muted)]">
              {teamLabel(MANYFAST_AWARD_TEAM_NUMBER, manyfast?.teams?.name ?? "")}
              {manyfast?.title ? ` — ${manyfast.title}` : ""}
            </span>
          </section>

          {/* ── 전시 진출 15팀 최종 순위 ── */}
          <section className="card mt-6 overflow-hidden !p-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-5">
              <h3 className="font-bold">전시 진출 15팀 최종 순위</h3>
              <p className="text-xs text-[var(--muted)]">
                심사 50% + 상호평가 25% + 주민투표 25%
              </p>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-y border-[var(--line)] bg-paper text-left text-xs text-[var(--muted)]">
                    <th className="px-5 py-2 font-medium">순위</th>
                    <th className="px-2 py-2 font-medium">팀</th>
                    <th className="px-2 py-2 text-right font-medium">심사</th>
                    <th className="px-2 py-2 text-right font-medium">상호평가</th>
                    <th className="px-2 py-2 text-right font-medium">주민투표</th>
                    <th className="px-5 py-2 text-right font-medium">최종</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.no}
                      className={`border-b border-[var(--line)] last:border-0 ${r.award ? "bg-gold-bright/10" : ""}`}
                    >
                      <td className="px-5 py-2.5 font-bold tabular-nums">{r.rank}</td>
                      <td className="px-2 py-2.5">
                        {r.project ? (
                          <Link href={`/gallery/${r.project.id}`} className="hover:underline">
                            {nameOf(r)}
                          </Link>
                        ) : (
                          nameOf(r)
                        )}
                        {r.award && (
                          <span className="ml-2 text-xs font-semibold text-gold-ink">
                            {r.award}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{fmt(r.judge)}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{fmt(r.peer)}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums">
                        {fmt(r.voteScore)}
                        <span className="ml-1 text-xs text-[var(--muted)]">({r.votes}표)</span>
                      </td>
                      <td className="px-5 py-2.5 text-right font-bold tabular-nums">
                        {fmt(r.final)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-[var(--line)] px-5 py-3 text-xs leading-relaxed text-[var(--muted)]">
              심사 = 심사위원 평가(90점, 최고·최저점 제외 평균) + 발표·참여도(10점) ·
              상호평가 = 팀 상호평가를 100점으로 환산 · 주민투표 = 최다 득표 팀(
              {`${topVotes}표`})을 100점으로 두고 득표 비율로 환산(3일간 총{" "}
              {`${TOTAL_VOTES.toLocaleString()}표`}) · 점수는 소수 셋째 자리에서
              반올림했습니다.
            </p>
          </section>
        </>
      ) : (
        <div className="card mt-8 py-12 text-center">
          <p className="display text-lg">결과 발표 준비 중입니다</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            수상팀은 대회가 끝난 뒤 이 페이지에서 확인하실 수 있습니다.
          </p>
        </div>
      )}
    </div>
  );
}
