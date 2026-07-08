import { createClient } from "@/lib/supabase/server";
import { Dday } from "@/components/Dday";

export const dynamic = "force-dynamic";

export default async function DdayPage() {
  const supabase = await createClient();
  const { data: milestones } = await supabase
    .from("milestones")
    .select("id, label, target_at")
    .order("target_at", { ascending: true });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">⏱️ D-day</h1>
      <p className="mt-1 text-[var(--muted)]">주요 일정까지 남은 시간입니다.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {milestones?.map((m) => (
          <Dday key={m.id} label={m.label} targetAt={m.target_at} />
        ))}
        {!milestones?.length && (
          <p className="card text-center text-[var(--muted)] sm:col-span-2">
            아직 등록된 마일스톤이 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}
