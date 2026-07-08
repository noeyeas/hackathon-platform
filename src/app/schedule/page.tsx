import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("schedule_items")
    .select("id, time_label, starts_at, title")
    .order("starts_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">🗓️ 일정표</h1>
      <p className="mt-1 text-[var(--muted)]">대회 진행 일정입니다.</p>

      {!items?.length ? (
        <p className="card mt-6 text-center text-[var(--muted)]">
          아직 등록된 일정이 없습니다.
        </p>
      ) : (
        <div className="card mt-6 !p-0">
          <ol className="flex flex-col">
            {items.map((it, i) => (
              <li
                key={it.id}
                className={`flex flex-col gap-0.5 px-5 py-4 sm:flex-row sm:items-center sm:gap-5 ${
                  i !== items.length - 1 ? "border-b border-[var(--line)]" : ""
                }`}
              >
                <span className="font-mono text-sm font-semibold text-vote sm:w-48 sm:flex-none">
                  {it.starts_at
                    ? formatDateTime(it.starts_at)
                    : (it.time_label ?? "—")}
                </span>
                <span className="text-sm">{it.title}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
