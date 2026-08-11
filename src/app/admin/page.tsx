import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { PHASE_LABEL, type EventPhase } from "@/lib/types";
import { completedByVoter, teamVoteTarget } from "@/lib/scoring";
import { AutoRefresh } from "@/components/AutoRefresh";
import { AdminPageHeader } from "./AdminPageHeader";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // 권한 검사는 admin/layout.tsx 가 처리한다.
  const admin = createAdminClient();
  const [
    { data: settings },
    { data: allTeams },
    { data: projectTeams },
    { data: criteria },
    { data: judges },
    { data: judgeScores },
    { data: teamScores },
  ] = await Promise.all([
    admin.from("event_settings").select("phase").single(),
    admin.from("teams").select("id, name").order("name"),
    admin.from("projects").select("team_id"),
    admin.from("criteria").select("id"),
    admin
      .from("users")
      .select("id, name, email")
      .eq("role", "judge")
      .order("name"),
    admin.from("judge_scores").select("judge_id, project_id, criteria_id"),
    admin.from("team_scores").select("voter_team_id, project_id, criteria_id"),
  ]);

  const teamList = allTeams ?? [];
  const teams = teamList.length;
  const submitted = (projectTeams ?? []).length;
  const criteriaCount = criteria?.length ?? 0;
  const submittedTeamIds = new Set(
    (projectTeams ?? []).map((p) => p.team_id as string)
  );

  // 아직 제출하지 않은 팀 — 이름까지 보여야 누구를 찾아갈지 바로 안다.
  const notSubmitted = teamList.filter((t) => !submittedTeamIds.has(t.id));

  // 심사위원: 전체 제출작을 모두 채점해야 완료.
  const judgeDone = completedByVoter(judgeScores, "judge_id", criteriaCount);
  const judgeRows = (judges ?? []).map((j) => {
    const done = Math.min(judgeDone.get(j.id)?.size ?? 0, submitted);
    return {
      key: j.id,
      name: j.name || j.email || "이름 없음",
      done,
      total: submitted,
      complete: submitted > 0 && done >= submitted,
    };
  });
  const judgeComplete = judgeRows.filter((r) => r.complete).length;

  // 팀 평가: 자기 팀을 뺀 나머지 제출작이 목표.
  // 목표치는 팀마다 다르다 — 제출하지 않은 팀은 뺄 자기 몫이 없어 1개 더 평가한다.
  const teamDone = completedByVoter(teamScores, "voter_team_id", criteriaCount);
  const teamRows = teamList.map((t) => {
    const total = teamVoteTarget(submitted, submittedTeamIds.has(t.id));
    const done = Math.min(teamDone.get(t.id)?.size ?? 0, total);
    return {
      key: t.id,
      name: t.name || "이름 없음",
      done,
      total,
      complete: total > 0 && done >= total,
    };
  });
  const teamComplete = teamRows.filter((r) => r.complete).length;

  return (
    <div className="flex flex-col gap-6">
      {/* 운영 중에는 화면을 띄워두고 보게 되므로 주기적으로 스스로 갱신한다. */}
      <AutoRefresh intervalMs={30000} />

      <AdminPageHeader
        title="운영 대시보드"
        desc={
          <>
            현재 단계 ·{" "}
            <b className="text-ink">
              {PHASE_LABEL[settings?.phase as EventPhase]}
            </b>
            <span className="text-[var(--muted)]"> · 30초마다 자동 갱신</span>
          </>
        }
        aside={
          <Link href="/admin/scoring" className="btn-ghost">
            집계 자세히 보기
          </Link>
        }
      />

      {/* 한눈에 보는 진행률 — 숫자보다 "얼마나 남았나"가 먼저 읽히도록 바를 함께 둔다. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="등록 팀" value={teams} unit="팀" />
        <Stat
          label="제출작"
          value={submitted}
          unit={`/ ${teams}팀`}
          done={submitted}
          total={teams}
          sub={
            notSubmitted.length > 0
              ? `${notSubmitted.length}팀 미제출`
              : "전 팀 제출 완료"
          }
        />
        <Stat
          label="심사 완료"
          value={judgeComplete}
          unit={`/ ${judgeRows.length}명`}
          done={judgeComplete}
          total={judgeRows.length}
          sub="전 팀 채점한 심사위원"
        />
        <Stat
          label="팀 평가 완료"
          value={teamComplete}
          unit={`/ ${teams}팀`}
          done={teamComplete}
          total={teams}
          sub="전 팀 평가한 팀"
        />
      </div>

      {/* 지금 챙길 대상 — 대시보드에서 다른 페이지로 넘어가지 않고도 누구를 재촉할지 보이게. */}
      <section>
        <h2 className="mb-3 font-title text-lg font-bold text-ink">
          지금 챙길 대상
        </h2>
        <div className="grid gap-3 lg:grid-cols-3">
          <PendingCard
            title="미제출 팀"
            count={notSubmitted.length}
            emptyText="모든 팀이 제출했습니다."
            href="/admin/teams"
            hrefLabel="팀 등록"
            items={notSubmitted.map((t) => ({
              key: t.id,
              name: t.name || "이름 없음",
            }))}
          />
          <PendingCard
            title="채점 미완료 심사위원"
            count={judgeRows.length - judgeComplete}
            emptyText={
              judgeRows.length === 0
                ? "등록된 심사위원이 없습니다."
                : "모든 심사위원이 채점을 마쳤습니다."
            }
            href="/admin/scoring"
            hrefLabel="심사 현황"
            items={judgeRows
              .filter((r) => !r.complete)
              .map((r) => ({
                key: r.key,
                name: r.name,
                detail: `${r.done}/${r.total}`,
              }))}
          />
          <PendingCard
            title="평가 미완료 팀"
            count={teamRows.length - teamComplete}
            emptyText={
              teamRows.length === 0
                ? "등록된 팀이 없습니다."
                : "모든 팀이 평가를 마쳤습니다."
            }
            href="/admin/scoring"
            hrefLabel="평가 현황"
            items={teamRows
              .filter((r) => !r.complete)
              .map((r) => ({
                key: r.key,
                name: r.name,
                detail: `${r.done}/${r.total}`,
              }))}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-title text-lg font-bold text-ink">바로가기</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AdminLink
            href="/admin/teams"
            title="팀 등록"
            desc="선정팀 등록·초대 코드"
          />
          <AdminLink
            href="/admin/scoring"
            title="심사 · 평가 · 투표"
            desc="투표 열기·진행 현황·집계"
          />
          <AdminLink
            href="/admin/announcements"
            title="공지 발행"
            desc="공지 작성·관리"
          />
          <AdminLink
            href="/admin/schedule"
            title="홈 타임라인"
            desc="타임라인 단계·D-day·장소"
          />
        </div>
      </section>
    </div>
  );
}

function AdminLink({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="card group !p-5 transition hover:border-navy/40 hover:bg-white"
    >
      <h3 className="font-bold">{title}</h3>
      <p className="mt-1 text-sm text-[var(--muted)]">{desc}</p>
      <span className="mt-3 inline-block text-sm font-medium text-navy transition group-hover:translate-x-0.5">
        열기 →
      </span>
    </Link>
  );
}

// 남은 대상 목록. 개수가 0이면 초록 완료 문구로 바뀌어 훑을 때 바로 걸러진다.
function PendingCard({
  title,
  count,
  items,
  emptyText,
  href,
  hrefLabel,
}: {
  title: string;
  count: number;
  items: { key: string; name: string; detail?: string }[];
  emptyText: string;
  href: string;
  hrefLabel: string;
}) {
  return (
    <div className="card flex flex-col !p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-bold">{title}</h3>
        <span
          className={`text-sm font-bold tabular-nums ${
            count > 0 ? "text-navy" : "text-team"
          }`}
        >
          {count > 0 ? `${count}` : "0"}
        </span>
      </div>

      {items.length > 0 ? (
        <ul className="mt-3 flex max-h-56 flex-col divide-y divide-[var(--line)] overflow-y-auto">
          {items.map((it) => (
            <li
              key={it.key}
              className="flex items-center justify-between gap-3 py-2 text-sm"
            >
              <span className="min-w-0 truncate">{it.name}</span>
              {it.detail && (
                <span className="flex-none tabular-nums text-[var(--muted)]">
                  {it.detail}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-team">{emptyText}</p>
      )}

      <Link
        href={href}
        className="mt-4 inline-block text-sm font-medium text-navy transition hover:translate-x-0.5"
      >
        {hrefLabel} →
      </Link>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  sub,
  done,
  total,
}: {
  label: string;
  value: number;
  unit?: string;
  sub?: string;
  done?: number;
  total?: number;
}) {
  const hasBar = typeof done === "number" && typeof total === "number";
  const pct = hasBar && total > 0 ? Math.round((done / total) * 100) : 0;
  const complete = hasBar && total > 0 && done >= total;

  return (
    <div className="card !p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-2 flex items-baseline gap-1">
        <span
          className={`text-3xl font-bold tabular-nums ${
            complete ? "text-team" : "text-ink"
          }`}
        >
          {value}
        </span>
        {unit && (
          <span className="text-sm font-medium text-[var(--muted)]">{unit}</span>
        )}
      </p>
      {hasBar && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-paper">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              complete ? "bg-team" : "bg-navy"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {sub && (
        <p
          className={`mt-2 text-xs ${
            complete ? "text-team" : "text-[var(--muted)]"
          }`}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
