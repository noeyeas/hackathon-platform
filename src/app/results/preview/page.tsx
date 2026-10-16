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
// (최종 = 1차 점수 75% + 주민투표 25%, 주민투표 점수 = 득표 ÷ 최다 득표 × 100).
type ScoreRow = {
  no: number;
  name: string; // 시트 팀명 (DB 팀명이 없을 때만 사용)
  first: number; // 1차 점수 (심사 + 발표 + 팀 상호평가)
  votes: number; // 주민투표 3일 총 득표
  voteScore: number; // 주민투표 점수 (100)
  final: number; // 최종 점수
};

const FINAL_SCORES: ScoreRow[] = [
  { no: 23, name: "경영과컴퓨터", first: 71.965, votes: 262, voteScore: 93.571, final: 77.367 },
  { no: 13, name: "NowonLikeUs", first: 68.675, votes: 280, voteScore: 100, final: 76.506 },
  { no: 24, name: "삼삼오오", first: 74.705, votes: 210, voteScore: 75, final: 74.779 },
  { no: 29, name: "지단", first: 72.933, votes: 145, voteScore: 51.786, final: 67.646 },
  { no: 4, name: "얼마Geo", first: 70.767, votes: 152, voteScore: 54.286, final: 66.646 },
  { no: 5, name: "라스트팡", first: 74.65, votes: 114, voteScore: 40.714, final: 66.166 },
  { no: 9, name: "월계동행", first: 72.901, votes: 111, voteScore: 39.643, final: 64.587 },
  { no: 32, name: "월계디버깅", first: 67.615, votes: 154, voteScore: 55, final: 64.461 },
  { no: 2, name: "솜사탕과 너구리", first: 69.1, votes: 141, voteScore: 50.357, final: 64.414 },
  { no: 40, name: "월계획", first: 74.445, votes: 84, voteScore: 30, final: 63.334 },
  { no: 10, name: "컴미컴", first: 68.791, votes: 95, voteScore: 33.929, final: 60.076 },
  { no: 19, name: "월계상단", first: 65.83, votes: 115, voteScore: 41.071, final: 59.64 },
  { no: 12, name: "우럭아왜우럭", first: 70.29, votes: 73, voteScore: 26.071, final: 59.235 },
  { no: 34, name: "허강정", first: 68.49, votes: 76, voteScore: 27.143, final: 58.153 },
  { no: 15, name: "복지나침반", first: 63.635, votes: 100, voteScore: 35.714, final: 56.655 },
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
          <div className="mt-5 flex items-end gap-5">
            <div>
              <p className="text-xs text-white/50">최종 점수</p>
              <p className="font-title text-4xl font-bold text-gold-bright">
                {fmt(grand.final)}
              </p>
            </div>
            <div className="pb-1 text-sm text-white/70">
              <p>1차 {fmt(grand.first)}</p>
              <p>주민투표 {grand.votes}표 · {fmt(grand.voteScore)}</p>
            </div>
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
              1차 {fmt(r.first)} · 주민투표 {r.votes}표
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
            1차 75% + 주민투표 25% · 주민투표 총 {TOTAL_VOTES.toLocaleString()}표
          </p>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-y border-[var(--line)] bg-paper text-left text-xs text-[var(--muted)]">
                <th className="px-5 py-2 font-medium">순위</th>
                <th className="px-2 py-2 font-medium">팀</th>
                <th className="px-2 py-2 text-right font-medium">1차</th>
                <th className="px-2 py-2 text-right font-medium">득표</th>
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
                  <td className="px-2 py-2.5 text-right tabular-nums">{fmt(r.first)}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{r.votes}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{fmt(r.voteScore)}</td>
                  <td className="px-5 py-2.5 text-right font-bold tabular-nums">
                    {fmt(r.final)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
