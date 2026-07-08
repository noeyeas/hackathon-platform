import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PHASE_LABEL, type EventPhase } from "@/lib/types";

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

  const { data: settings } = await supabase
    .from("event_settings")
    .select("phase")
    .single();

  const [{ count: teamCount }, { count: projectCount }, { count: tokenCount }] =
    await Promise.all([
      supabase.from("teams").select("id", { count: "exact", head: true }),
      supabase.from("projects").select("id", { count: "exact", head: true }),
      supabase.from("audience_tokens").select("id", { count: "exact", head: true }),
    ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">운영 대시보드</h1>
        <p className="mt-1 text-[var(--muted)]">
          현재 단계 · <b>{PHASE_LABEL[settings?.phase as EventPhase]}</b>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="등록 팀" value={teamCount ?? 0} />
        <Stat label="제출작" value={projectCount ?? 0} />
        <Stat label="발급 QR" value={tokenCount ?? 0} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <AdminLink
          href="/admin/teams"
          title="팀 등록"
          desc="선정팀 등록·초대 코드"
        />
        <AdminLink
          href="/admin/voting"
          title="투표 관리"
          desc="단계 전환·실시간 집계"
        />
        <AdminLink href="/judge" title="심사 채점" desc="심사위원 채점 화면" />
        <AdminLink
          href="/admin/announcements"
          title="공지사항"
          desc="공지 작성·관리"
        />
        <AdminLink
          href="/admin/schedule"
          title="일정 · D-day"
          desc="대회 날짜·일정표 관리"
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
