import { createClient } from "@/lib/supabase/server";
import { ScheduleBoard } from "@/components/ScheduleBoard";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("schedule_items")
    .select("id, time_label, starts_at, ends_at, title, detail")
    .order("starts_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold">🗓️ 일정표</h1>
      <p className="mt-1 text-[var(--muted)]">대회 진행 일정입니다.</p>

      {!items?.length ? (
        <p className="card mt-6 text-center text-[var(--muted)]">
          아직 등록된 일정이 없습니다.
        </p>
      ) : (
        <div className="mt-6">
          <ScheduleBoard items={items} />
        </div>
      )}
    </div>
  );
}
