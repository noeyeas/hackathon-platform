import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { PHASE_LABEL, type EventPhase } from "@/lib/types";
import { completedByVoter, teamVoteTarget } from "@/lib/scoring";
import { AdminPageHeader } from "./AdminPageHeader";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // 권한 검사는 admin/layout.tsx 가 처리한다.
  const admin = createAdminClient();
  const [
    { data: settings },
    { count: teamCount },
    { data: projectTeams, count: projectCount },
    { data: criteria },
    { data: judges },
    { data: judgeScores },
    { data: teamScores },
  ] = await Promise.all([
    admin.from("event_settings").select("phase").single(),
    admin.from("teams").select("id", { count: "exact", head: true }),
    admin.from("projects").select("team_id", { count: "exact" }),
    admin.from("criteria").select("id"),
    admin.from("users").select("id", { count: "exact" }).eq("role", "judge"),
    admin.from("judge_scores").select("judge_id, project_id, criteria_id"),
    admin.from("team_scores").select("voter_team_id, project_id, criteria_id"),
  ]);

  const teams = teamCount ?? 0;
  const submitted = projectCount ?? 0;
  const criteriaCount = criteria?.length ?? 0;

  // 심사위원 채점 완료 = 전체 제출작(submitted)을 모두 채점한 심사위원 수
  const judgeCount = judges?.length ?? 0;
  const judgeDone = completedByVoter(judgeScores, "judge_id", criteriaCount);
  const judgeComplete = [...judgeDone.values()].filter(
    (s) => submitted > 0 && s.size >= submitted
  ).length;

  // 팀 평가 완료 = 자기 팀을 뺀 나머지 제출작을 모두 평가한 팀 수.
  // 목표치는 팀마다 다르다 — 제출하지 않은 팀은 뺄 자기 몫이 없어 1개 더 평가한다.
  const submittedTeamIds = new Set(
    (projectTeams ?? []).map((p) => p.team_id as string)
  );
  const teamDone = completedByVoter(teamScores, "voter_team_id", criteriaCount);
  const teamComplete = [...teamDone].filter(([votingTeamId, done]) => {
    const target = teamVoteTarget(submitted, submittedTeamIds.has(votingTeamId));
    return target > 0 && done.size >= target;
  }).length;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="운영 대시보드"
        desc={
          <>
            현재 단계 ·{" "}
            <b className="text-ink">
              {PHASE_LABEL[settings?.phase as EventPhase]}
            </b>
          </>
        }
        aside={
          <Link href="/admin/scoring" className="btn-ghost">
            집계 자세히 보기
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="등록 팀" value={teams} unit="팀" />
        <Stat
          label="제출작"
          value={submitted}
          unit={`/ ${teams}팀`}
          sub={
            teams > 0 ? `${Math.round((submitted / teams) * 100)}% 제출` : undefined
          }
          tone={teams > 0 && submitted >= teams ? "done" : "pending"}
        />
        <Stat
          label="심사 완료"
          value={judgeComplete}
          unit={`/ ${judgeCount}명`}
          sub="전 팀 채점한 심사위원"
          tone={judgeCount > 0 && judgeComplete >= judgeCount ? "done" : "pending"}
        />
        <Stat
          label="팀 평가 완료"
          value={teamComplete}
          unit={`/ ${teams}팀`}
          sub="전 팀 평가한 팀"
          tone={teams > 0 && teamComplete >= teams ? "done" : "pending"}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <AdminLink href="/admin/teams" title="팀 등록" desc="선정팀 등록·초대 코드" />
        <AdminLink
          href="/admin/scoring"
          title="심사 · 평가 · 투표"
          desc="투표 열기·진행 현황·집계"
        />
        <AdminLink href="/admin/announcements" title="공지 발행" desc="공지 작성·관리" />
        <AdminLink
          href="/admin/schedule"
          title="홈 타임라인"
          desc="타임라인 단계·D-day·장소"
        />
        <AdminLink href="/admin/stage" title="발표 진행" desc="현재 발표 팀 지정" />
      </div>
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
      <h2 className="font-bold">{title}</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">{desc}</p>
      <span className="mt-3 inline-block text-sm font-medium text-navy transition group-hover:translate-x-0.5">
        열기 →
      </span>
    </Link>
  );
}

function Stat({
  label,
  value,
  unit,
  sub,
  tone,
}: {
  label: string;
  value: number;
  unit?: string;
  sub?: string;
  tone?: "done" | "pending";
}) {
  return (
    <div className="card !p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-2 flex items-baseline gap-1">
        <span
          className={`text-3xl font-bold tabular-nums ${
            tone === "done" ? "text-team" : "text-ink"
          }`}
        >
          {value}
        </span>
        {unit && (
          <span className="text-sm font-medium text-[var(--muted)]">{unit}</span>
        )}
      </p>
      {sub && <p className="mt-1 text-xs text-[var(--muted)]">{sub}</p>}
    </div>
  );
}
