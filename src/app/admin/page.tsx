import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { PHASE_LABEL, type EventPhase } from "@/lib/types";
import { completedByVoter } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: me } = user
    ? await supabase.from("users").select("role").eq("id", user.id).single()
    : { data: null };

  if (me?.role !== "admin") {
    return (
      <div className="card mx-auto max-w-md text-center">
        <h1 className="text-xl font-bold">운영진 전용 페이지입니다</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Supabase의 users 테이블에서 role을 admin으로 변경하면 접근할 수
          있습니다.
        </p>
      </div>
    );
  }

  const admin = createAdminClient();
  const [
    { data: settings },
    { count: teamCount },
    { count: projectCount },
    { data: criteria },
    { data: judges },
    { data: judgeScores },
    { data: teamScores },
  ] = await Promise.all([
    admin.from("event_settings").select("phase").single(),
    admin.from("teams").select("id", { count: "exact", head: true }),
    admin.from("projects").select("id", { count: "exact", head: true }),
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

  // 팀 평가 완료 = 자기 팀 제외 나머지(submitted-1)를 모두 평가한 팀 수
  const teamTarget = Math.max(0, submitted - 1);
  const teamDone = completedByVoter(teamScores, "voter_team_id", criteriaCount);
  const teamComplete = [...teamDone.values()].filter(
    (s) => teamTarget > 0 && s.size >= teamTarget
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">운영 대시보드</h1>
        <p className="mt-1 text-[var(--muted)]">
          현재 단계 · <b>{PHASE_LABEL[settings?.phase as EventPhase]}</b>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="등록 팀" value={`${teams}`} />
        <Stat
          label="제출작"
          value={`${submitted} / ${teams}`}
          sub={teams > 0 ? `${Math.round((submitted / teams) * 100)}% 제출` : undefined}
          tone={teams > 0 && submitted >= teams ? "done" : "pending"}
        />
        <Stat
          label="심사 완료"
          value={`${judgeComplete} / ${judgeCount}`}
          sub="전 팀 채점한 심사위원"
          tone={judgeCount > 0 && judgeComplete >= judgeCount ? "done" : "pending"}
        />
        <Stat
          label="팀 평가 완료"
          value={`${teamComplete} / ${submitted}`}
          sub="전 팀 평가한 팀"
          tone={submitted > 0 && teamComplete >= submitted ? "done" : "pending"}
        />
      </div>

      <Link
        href="/admin/scoring"
        className="text-sm font-medium text-admin hover:underline"
      >
        채점 진행 현황·집계 자세히 보기 →
      </Link>

      <div className="grid gap-4 sm:grid-cols-3">
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
          title="공지사항"
          desc="공지 작성·관리"
        />
        <AdminLink
          href="/admin/schedule"
          title="홈 타임라인"
          desc="타임라인 단계·D-day·장소 관리"
        />
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
      className="card transition hover:border-admin hover:shadow-md"
    >
      <h2 className="font-bold">{title}</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">{desc}</p>
      <span className="mt-3 inline-block text-sm font-medium text-admin">
        열기 →
      </span>
    </Link>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "done" | "pending";
}) {
  return (
    <div className="card">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p
        className={`mt-1 text-3xl font-bold tabular-nums ${
          tone === "done" ? "text-team" : ""
        }`}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-[var(--muted)]">{sub}</p>}
    </div>
  );
}
