import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PHASE_LABEL, type EventPhase } from "@/lib/types";
import { PhaseControl } from "./PhaseControl";
import { WeightControl } from "./WeightControl";

export const dynamic = "force-dynamic";

const PHASES: EventPhase[] = [
  "signup",
  "team_building",
  "building",
  "submitted",
  "voting",
  "closed",
];

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
    .select("*")
    .single();

  const [{ count: teamCount }, { count: projectCount }, { count: tokenCount }] =
    await Promise.all([
      supabase.from("teams").select("id", { count: "exact", head: true }),
      supabase.from("projects").select("id", { count: "exact", head: true }),
      supabase.from("audience_tokens").select("id", { count: "exact", head: true }),
    ]);

  const weights = settings?.weights ?? { judge: 0.5, team: 0.25, audience: 0.25 };

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

      <div className="card">
        <h2 className="mb-3 font-bold">대회 단계 전환</h2>
        <PhaseControl current={settings?.phase as EventPhase} phases={PHASES} />
      </div>

      <div className="card">
        <h2 className="mb-1 font-bold">점수 가중치</h2>
        <p className="mb-4 text-sm text-[var(--muted)]">합이 100%가 되어야 합니다.</p>
        <WeightControl weights={weights} />
      </div>

      <div className="card flex items-center justify-between">
        <div>
          <h2 className="font-bold">관객 투표 QR</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            테이블별 QR을 생성하고 인쇄용 시트로 출력합니다.
          </p>
        </div>
        <Link href="/admin/qr" className="btn-primary">
          QR 관리
        </Link>
      </div>
    </div>
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
