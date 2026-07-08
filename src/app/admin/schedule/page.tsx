import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/ActionForm";
import { setEventDate, addScheduleItem } from "./actions";
import { ScheduleItemRow } from "./ScheduleItemRow";

export const dynamic = "force-dynamic";

// ISO → datetime-local input 값 (YYYY-MM-DDTHH:mm)
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function AdminSchedulePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") redirect("/");

  const { data: settings } = await supabase
    .from("event_settings")
    .select("event_date")
    .single();

  const { data: items } = await supabase
    .from("schedule_items")
    .select("id, time_label, title, sort")
    .order("sort", { ascending: true })
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">일정 관리</h1>
      <p className="mt-1 text-[var(--muted)]">
        대회 날짜와 일정표는 홈 화면에 D-day·타임라인으로 표시됩니다.
      </p>

      {/* 대회 날짜 */}
      <div className="card mt-6">
        <h2 className="mb-3 font-bold">대회 날짜 (D-day 기준)</h2>
        <ActionForm
          action={setEventDate}
          submitLabel="날짜 저장"
          successMessage="대회 날짜를 저장했습니다. 새로고침하세요."
        >
          <input
            name="event_date"
            type="datetime-local"
            defaultValue={toLocalInput(settings?.event_date ?? null)}
            className="input"
          />
        </ActionForm>
      </div>

      {/* 일정 추가 */}
      <div className="card mt-6">
        <h2 className="mb-3 font-bold">일정 항목 추가</h2>
        <ActionForm
          action={addScheduleItem}
          submitLabel="일정 추가"
          successMessage="추가했습니다. 새로고침하세요."
        >
          <div className="grid grid-cols-[120px_1fr_90px] gap-2">
            <div>
              <label className="label">시간</label>
              <input name="time_label" className="input" placeholder="10:00" />
            </div>
            <div>
              <label className="label">내용 *</label>
              <input name="title" required className="input" placeholder="개회식 & 오리엔테이션" />
            </div>
            <div>
              <label className="label">순서</label>
              <input name="sort" type="number" defaultValue={0} className="input" />
            </div>
          </div>
        </ActionForm>
      </div>

      {/* 일정 목록 */}
      <div className="mt-6 flex flex-col gap-2">
        {items?.map((it) => (
          <ScheduleItemRow
            key={it.id}
            id={it.id}
            timeLabel={it.time_label}
            title={it.title}
            sort={it.sort}
          />
        ))}
        {!items?.length && (
          <p className="card text-center text-[var(--muted)]">
            아직 일정이 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}
