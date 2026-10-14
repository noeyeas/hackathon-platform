import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { teamLabel } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { getGalleryProjects, type GalleryProjectRow } from "@/lib/galleryData";
import { AWARD_LABELS } from "@/lib/types";
import {
  FINAL_AWARD_TEAM_NUMBERS,
  MANYFAST_AWARD_TEAM_NUMBER,
} from "@/lib/awards";

export const dynamic = "force-dynamic";

// 결과 페이지는 수상팀만 보여 준다. 점수·순위·산정 방식은 공개하지 않는다.
// 수상팀은 대회 종료(phase 'closed') 뒤에만 공개하고, 운영진은 미리 볼 수 있다.
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

  const winners = FINAL_AWARD_TEAM_NUMBERS.map((no, i) => ({
    no,
    label: AWARD_LABELS[i] as string,
    project: byTeamNo.get(no) ?? null,
  }));
  const [grand, ...others] = winners;
  const manyfast = byTeamNo.get(MANYFAST_AWARD_TEAM_NUMBER) ?? null;

  const nameOf = (no: number, p: GalleryProjectRow | null) =>
    teamLabel(no, p?.teams?.name ?? "");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow={showFinal ? "Final Result" : "Result"}
        title={showFinal ? "최종 결과" : "결과 발표"}
        desc={
          showFinal
            ? "2026 광운대학교 KW 해커톤 수상팀을 소개합니다. 함께해 주신 모든 분께 감사드립니다."
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
          <section className="mt-8 overflow-hidden rounded-lg bg-navy px-6 py-8 text-white sm:px-8 sm:py-10">
            <p className="eyebrow !text-gold-bright">🥇 {grand.label}</p>
            <h2 className="mt-3 font-title text-3xl font-bold leading-tight sm:text-4xl">
              {grand.project?.title ?? nameOf(grand.no, grand.project)}
            </h2>
            <p className="mt-1 font-title text-xl font-medium text-white/60">
              {nameOf(grand.no, grand.project)}
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
          </section>

          {/* ── 광운대학교 총장상 ── */}
          <section className="mt-6 grid gap-4 sm:grid-cols-3">
            {others.map((w) => (
              <div key={w.no} className="card flex h-full flex-col gap-1">
                <span className="badge-navy self-start">🥈 {w.label}</span>
                <h3 className="mt-2 font-bold leading-snug">
                  {w.project?.title ?? nameOf(w.no, w.project)}
                </h3>
                <p className="text-sm text-[var(--muted)]">
                  {nameOf(w.no, w.project)}
                </p>
                {w.project && (
                  <Link
                    href={`/gallery/${w.project.id}`}
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
              {nameOf(MANYFAST_AWARD_TEAM_NUMBER, manyfast)}
              {manyfast?.title ? ` — ${manyfast.title}` : ""}
            </span>
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
