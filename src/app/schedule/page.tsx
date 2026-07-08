import { createClient } from "@/lib/supabase/server";
import { scheduleWhen } from "@/lib/format";
import { ScheduleCalendar } from "@/components/ScheduleCalendar";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("schedule_items")
    .select("id, time_label, starts_at, title, detail")
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
        <div className="mt-6 grid gap-6 lg:grid-cols-[20rem_1fr] lg:items-start">
          {/* 왼쪽: 달력 */}
          <ScheduleCalendar items={items} />

          {/* 오른쪽: 일정표 */}
          <div className="card !p-0">
          <ol className="flex flex-col">
            {items.map((it, i) => {
              const when = scheduleWhen(it.time_label, it.starts_at);
              const border =
                i !== items.length - 1 ? "border-b border-[var(--line)]" : "";
              const hasDetail = !!it.detail?.trim();

              if (!hasDetail) {
                return (
                  <li
                    key={it.id}
                    className={`flex flex-col gap-0.5 px-5 py-4 sm:flex-row sm:items-center sm:gap-5 ${border}`}
                  >
                    <span className="font-mono text-sm font-semibold text-vote sm:w-48 sm:flex-none">
                      {when}
                    </span>
                    <span className="text-sm">{it.title}</span>
                  </li>
                );
              }

              return (
                <li key={it.id} className={border}>
                  <details className="group">
                    <summary className="flex cursor-pointer list-none flex-col gap-0.5 px-5 py-4 hover:bg-gray-50 sm:flex-row sm:items-center sm:gap-5">
                      <span className="font-mono text-sm font-semibold text-vote sm:w-48 sm:flex-none">
                        {when}
                      </span>
                      <span className="flex flex-1 items-center gap-2 text-sm">
                        {it.title}
                        <span className="ml-auto text-[var(--muted)] transition-transform group-open:rotate-180">
                          ⌄
                        </span>
                      </span>
                    </summary>
                    <div className="whitespace-pre-wrap border-t border-dashed border-[var(--line)] bg-gray-50/50 px-5 py-3 text-sm leading-relaxed text-[var(--muted)] sm:pl-[13.25rem]">
                      {it.detail}
                    </div>
                  </details>
                </li>
              );
            })}
          </ol>
          </div>
        </div>
      )}
    </div>
  );
}
