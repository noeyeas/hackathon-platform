import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { teamLabel } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { getGalleryProjects, type GalleryProjectRow } from "@/lib/galleryData";
import { AWARD_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

// 테스트용 — 결과 페이지에 점수·순위를 공개하면 어떻게 보이는지 운영진만 미리 보는 화면.
// 메뉴에 링크가 없고, 운영자 계정이 아니면 404 를 돌려준다.
// 점수는 사이트 밖 「2026 KW 해커톤 최종 점수 집계」 시트 값을 옮겨 적은 것이다
// (최종 = 심사 50% + 상호평가 25% + 주민투표 25%, 주민투표 점수 = 득표 ÷ 최다 득표 × 100).
type ScoreRow = {
  no: number;
  name: string; // 시트 팀명 (DB 팀명이 없을 때만 사용)
  judge: number; // 심사 점수 (심사위원 평균 + 발표·참여도, 100점)
  peer: number; // 팀 상호평가 점수 (100점 환산)
  votes: number; // 주민투표 3일 총 득표
  final: number; // 최종 점수 (심사 50% + 상호평가 25% + 주민투표 25%)
};

const FINAL_SCORES: ScoreRow[] = [
  { no: 23, name: "경영과컴퓨터", judge: 81.33, peer: 53.23, votes: 262, final: 77.37 },
  { no: 13, name: "NowonLikeUs", judge: 75.67, peer: 54.69, votes: 280, final: 76.51 },
  { no: 24, name: "삼삼오오", judge: 82.67, peer: 58.78, votes: 210, final: 74.78 },
  { no: 29, name: "지단", judge: 81.0, peer: 56.8, votes: 145, final: 67.65 },
  { no: 4, name: "얼마Geo", judge: 78.0, peer: 56.3, votes: 152, final: 66.65 },
  { no: 5, name: "라스트팡", judge: 81.0, peer: 61.95, votes: 114, final: 66.17 },
  { no: 9, name: "월계동행", judge: 82.67, peer: 53.37, votes: 111, final: 64.59 },
  { no: 32, name: "월계디버깅", judge: 72.67, peer: 57.51, votes: 154, final: 64.46 },
  { no: 2, name: "솜사탕과 너구리", judge: 77.0, peer: 53.3, votes: 141, final: 64.41 },
  { no: 40, name: "월계획", judge: 83.33, peer: 56.67, votes: 84, final: 63.33 },
  { no: 10, name: "컴미컴", judge: 77.67, peer: 51.04, votes: 95, final: 60.08 },
  { no: 19, name: "월계상단", judge: 73.0, peer: 51.49, votes: 115, final: 59.64 },
  { no: 12, name: "우럭아왜우럭", judge: 80.0, peer: 50.87, votes: 73, final: 59.24 },
  { no: 34, name: "허강정", judge: 79.0, peer: 47.47, votes: 76, final: 58.15 },
  { no: 15, name: "복지나침반", judge: 71.67, peer: 47.57, votes: 100, final: 56.65 },
];

const TOTAL_VOTES = 2112;
const fmt = (n: number) => n.toFixed(2);

export default async function ResultsPreviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data: me } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") notFound();

  const { projects } = await getGalleryProjects();
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
  const nameOf = (r: (typeof rows)[number]) =>
    teamLabel(r.no, r.project?.teams?.name ?? r.name);

  const [grand, ...others] = rows.slice(0, 4);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Test · 운영진 전용"
        title="최종 결과 (점수 공개 테스트)"
        desc="결과 페이지에 점수와 순위를 공개하면 이렇게 보입니다. 실제 결과 페이지에는 반영되지 않습니다."
      />

      <p className="mt-5 rounded-md border border-admin/20 bg-admin/[0.06] px-4 py-3 text-sm text-admin">
        테스트 화면입니다. 운영자 계정만 볼 수 있고 메뉴에는 링크가 없습니다. 점수는
        최종 점수 집계 시트 값입니다.
      </p>

      {/* ── 노원구청장상 ── */}
      <section className="relative isolate mt-8 overflow-hidden rounded-lg bg-navy px-6 py-8 text-white sm:px-8 sm:py-10">
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
          <p className="eyebrow !text-gold-bright">🥇 1위 · {grand.award}</p>
          <h2 className="mt-3 font-title text-3xl font-bold leading-tight sm:text-4xl">
            {grand.project?.title ?? nameOf(grand)}
          </h2>
          <p className="mt-1 font-title text-xl font-medium text-white/60">
            {nameOf(grand)}
          </p>
          <div className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-3">
            <div>
              <p className="text-xs text-white/50">최종 점수</p>
              <p className="font-title text-4xl font-bold text-gold-bright">
                {fmt(grand.final)}
              </p>
            </div>
            <dl className="grid grid-cols-3 gap-x-5 pb-1 text-sm">
              <div>
                <dt className="text-xs text-white/50">심사</dt>
                <dd className="font-semibold tabular-nums">{fmt(grand.judge)}</dd>
              </div>
              <div>
                <dt className="text-xs text-white/50">상호평가</dt>
                <dd className="font-semibold tabular-nums">{fmt(grand.peer)}</dd>
              </div>
              <div>
                <dt className="text-xs text-white/50">득표</dt>
                <dd className="font-semibold tabular-nums">{grand.votes}표</dd>
              </div>
            </dl>
          </div>
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
            <span className="badge-navy self-start">
              🥈 {r.rank}위 · {r.award}
            </span>
            <h3 className="mt-2 font-bold leading-snug">
              {r.project?.title ?? nameOf(r)}
            </h3>
            <p className="text-sm text-[var(--muted)]">{nameOf(r)}</p>
            <p className="mt-3 font-title text-2xl font-bold text-navy">
              {fmt(r.final)}
              <span className="ml-1 text-sm font-medium text-[var(--muted)]">점</span>
            </p>
            <p className="text-xs text-[var(--muted)]">
              심사 {fmt(r.judge)} · 상호평가 {fmt(r.peer)} · {r.votes}표
            </p>
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

      {/* ── 전체 순위 ── */}
      <section className="card mt-6 !p-0 overflow-hidden">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-5">
          <h3 className="font-bold">전시 진출 15팀 최종 순위</h3>
          <p className="text-xs text-[var(--muted)]">
            심사 50% + 상호평가 25% + 주민투표 25% · 주민투표 총 {TOTAL_VOTES.toLocaleString()}표
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
                <th className="px-2 py-2 text-right font-medium">득표</th>
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
                  <td className="px-2 py-2.5 text-right tabular-nums">{r.votes}</td>
                  <td className="px-5 py-2.5 text-right font-bold tabular-nums">
                    {fmt(r.final)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-[var(--line)] px-5 py-3 text-xs text-[var(--muted)]">
          심사 = 심사위원 평균(90점) + 발표·참여도(10점). 상호평가는 100점 환산. 주민투표는
          최다 득표 팀을 100점으로 두고 득표 비율로 환산해 최종 점수에 반영했습니다.
        </p>
      </section>
    </div>
  );
}
