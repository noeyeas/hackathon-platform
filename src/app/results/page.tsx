import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { safeUrl } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import {
  AWARD_LABELS,
  FINALIST_COUNT,
  SCORE_WEIGHTS,
  type Ranking,
  type EventPhase,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ResultsPage() {
  const supabase = await createClient();

  // 서로 무관한 조회는 한 번에 — 직렬 왕복을 줄여 페이지 전환을 빠르게 한다.
  const [
    { data: settings },
    {
      data: { user },
    },
    { data: criteria },
    { data: teamNotes },
  ] = await Promise.all([
    supabase
      .from("event_settings")
      .select("phase, weights, finalist_count")
      .single(),
    supabase.auth.getUser(),
    // 심사위원 배점 기준 (관리자에서 관리) — 결과 페이지에서 펼쳐볼 수 있게 노출
    supabase
      .from("criteria")
      .select("name, weight, max_score, description")
      .order("sort")
      .returns<
        {
          name: string;
          weight: number;
          max_score: number;
          description: string | null;
        }[]
      >(),
    // 팀별 팀원 구성 (팀 이름 hover 툴팁용)
    supabase.from("teams").select("id, members_note"),
  ]);

  const phase = (settings?.phase ?? "signup") as EventPhase;
  // 집계 뷰(rankings)와 동일하게 event_settings 값을 사용 — 표시/계산 일치.
  // 선정 팀 수도 DB 를 따른다. 코드 상수를 그대로 쓰면 운영진이 DB 값을
  // 바꿨을 때 화면 문구만 4팀으로 남아 실제 선정 결과와 어긋난다.
  const weights =
    (settings?.weights as typeof SCORE_WEIGHTS | null) ?? SCORE_WEIGHTS;
  const finalistCount = settings?.finalist_count ?? FINALIST_COUNT;

  const showFinal = phase === "closed";

  // 실시간 순위는 종료 전 비공개. 운영진은 종료 전에도 미리보기 허용.
  let isAdmin = false;
  if (user) {
    const { data: me } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    isAdmin = me?.role === "admin";
  }
  const canSeeRankings = showFinal || isAdmin;

  // rankings 뷰는 anon/authenticated 접근이 막혀 있으므로(0022) 공개 조건일 때만
  // Service Role 로 읽는다. 종료 전 일반 사용자에게는 순위/점수를 노출하지 않는다.
  const { data: rankings } = canSeeRankings
    ? await createAdminClient().from("rankings").select("*").returns<Ranking[]>()
    : { data: null as Ranking[] | null };

  // 1위 팀은 상단에 크게 — 소개·링크가 필요해 제출물을 한 번 더 읽는다.
  const top = rankings?.[0] ?? null;
  const { data: topProject } = top
    ? await supabase
        .from("projects")
        .select("description, repo_url, demo_url, video_url")
        .eq("id", top.project_id)
        .maybeSingle()
    : { data: null };

  const noteByTeam = new Map(
    (teamNotes ?? []).map((t) => [t.id as string, t.members_note as string | null])
  );

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow={showFinal ? "Final Result" : "Progress"}
        title={showFinal ? "최종 결과" : "집계 현황"}
        desc={
          <>
            1차 심사 {pct(weights.judge / (weights.judge + weights.team))} 심사위원
            {" / "}
            {pct(weights.team / (weights.judge + weights.team))} 팀 상호평가 →
            상위 {finalistCount}팀 · 주민투표로 대상 선정
            {!showFinal && " · 투표 종료 후 최종 순위가 공개됩니다."}
          </>
        }
      />

      {isAdmin && !showFinal && (
        <p className="mt-5 rounded-md border border-admin/20 bg-admin/[0.06] px-4 py-3 text-sm text-admin">
          운영자 미리보기입니다. 참가자·관객에게는 종료 전까지 순위가 보이지
          않습니다.
        </p>
      )}

      {/* ── 대상 팀 히어로 ── */}
      {canSeeRankings && top && (
        <section className="mt-8 overflow-hidden rounded-lg bg-navy px-6 py-8 text-white sm:px-8 sm:py-10">
          <p className="eyebrow !text-gold-bright">Grand Prize · 대상</p>
          <h2 className="mt-3 font-title text-3xl font-bold leading-tight sm:text-4xl">
            {top.title}
          </h2>
          <p className="mt-1 font-title text-xl font-medium text-white/60">
            Team {top.team_name}
          </p>

          {topProject?.description && (
            <p className="mt-5 max-w-xl whitespace-pre-wrap text-sm leading-relaxed text-white/75">
              {topProject.description}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/gallery/${top.project_id}`} className="btn-gold">
              제출작 보기
            </Link>
            {topProject?.video_url && (
              <a
                href={safeUrl(topProject.video_url)}
                target="_blank"
                rel="noreferrer"
                className="btn border border-white/25 bg-white/10 text-white hover:bg-white/20"
              >
                데모 영상 ↗
              </a>
            )}
            {topProject?.repo_url && (
              <a
                href={safeUrl(topProject.repo_url)}
                target="_blank"
                rel="noreferrer"
                className="btn border border-white/25 bg-white/10 text-white hover:bg-white/20"
              >
                GitHub ↗
              </a>
            )}
          </div>
        </section>
      )}

      {/* ── 심사 기준 ── */}
      {!!criteria?.length && (
        <details className="group mt-6 rounded-lg border border-[var(--line)] bg-white">
          <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold">
            <span>심사기준 {criteria.length}가지 보기</span>
            <span className="text-[var(--muted)] transition group-open:rotate-180">
              ⌄
            </span>
          </summary>
          <ol className="flex flex-col border-t border-[var(--line)]">
            {criteria.map((c, i) => (
              <li
                key={c.name}
                className={`flex gap-3 px-4 py-3 ${
                  i !== criteria.length - 1 ? "border-b border-[var(--line)]" : ""
                }`}
              >
                <span className="mt-0.5 flex-none text-xs font-bold text-gold-ink">
                  {pct(c.weight / 100)}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{c.name}</p>
                  {c.description && (
                    <p className="mt-0.5 text-xs text-[var(--muted)]">
                      {c.description}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </details>
      )}

      {/* ── 최종 순위 ── */}
      {canSeeRankings ? (
        <section className="mt-8">
          <div className="mb-3 flex items-baseline gap-3">
            <span className="eyebrow">Final Score</span>
            <h2 className="display text-xl">최종 순위</h2>
          </div>

          <div className="panel overflow-x-auto">
            <table className="tbl min-w-[560px]">
              <thead>
                <tr>
                  <th className="w-16">순위</th>
                  <th>팀 · 작품</th>
                  <th className="!text-right">심사</th>
                  <th className="!text-right">팀 점수</th>
                  <th className="!text-right">주민표</th>
                  <th className="!text-right">1차 점수</th>
                </tr>
              </thead>
              <tbody>
                {rankings?.map((r, i) => {
                  // 시상 배지는 순번이 아니라 선정 여부로 결정한다.
                  // 뷰가 이미 시상 순서로 정렬해 주므로(선정팀 먼저, 그 안에서
                  // 주민표 순) 선정팀의 i 가 곧 상 순서가 된다.
                  const award =
                    r.is_finalist && i < AWARD_LABELS.length
                      ? AWARD_LABELS[i]
                      : null;
                  return (
                    <tr key={r.project_id} className={i === 0 ? "bg-gold-soft/50" : ""}>
                      <td>
                        {award ? (
                          <span className={i === 0 ? "badge-gold" : i === 1 ? "badge-navy" : "badge-line"}>
                            {award}
                          </span>
                        ) : (
                          <span className="tabular-nums text-[var(--muted)]">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                        )}
                      </td>
                      <td>
                        <Link
                          href={`/gallery/${r.project_id}`}
                          className="font-semibold hover:text-navy hover:underline"
                          title={
                            noteByTeam.get(r.team_id)
                              ? `팀원 구성\n${noteByTeam.get(r.team_id)}`
                              : undefined
                          }
                        >
                          {r.team_name}
                        </Link>
                        <span className="ml-2 text-xs text-[var(--muted)]">
                          {r.title}
                        </span>
                      </td>
                      <td className="num">{r.judge_score}</td>
                      <td className="num">{r.team_votes}</td>
                      <td className="num">{r.audience_votes}</td>
                      <td className="num text-base font-bold text-navy">
                        {r.final_score}
                      </td>
                    </tr>
                  );
                })}
                {!rankings?.length && (
                  <tr>
                    <td
                      colSpan={6}
                      className="!py-10 text-center text-[var(--muted)]"
                    >
                      아직 집계할 데이터가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <div className="card mt-8 py-12 text-center">
          <p className="display text-lg">투표 종료 후 순위가 공개됩니다</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            공정성을 위해 대회가 종료되기 전까지 실시간 순위와 점수는
            비공개입니다.
          </p>
        </div>
      )}
    </div>
  );
}

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}
