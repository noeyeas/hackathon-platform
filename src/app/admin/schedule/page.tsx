import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/ActionForm";
import { formatDateTime } from "@/lib/format";
import { addMilestone, addScheduleItem } from "./actions";
import { DeleteRow } from "./DeleteRow";

export const dynamic = "force-dynamic";

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

  const { data: milestones } = await supabase
    .from("milestones")
    .select("id, label, target_at, sort")
    .order("target_at", { ascending: true });

  const { data: items } = await supabase
    .from("schedule_items")
    .select("id, time_label, starts_at, title")
    .order("starts_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">일정 · D-day 관리</h1>
      <p className="mt-1 text-[var(--muted)]">
        마일스톤(D-day)과 일정표는 홈 화면에 표시됩니다.
      </p>

      {/* 마일스톤 */}
      <div className="card mt-6">
        <h2 className="mb-1 font-bold">D-day 마일스톤</h2>
        <p className="mb-4 text-sm text-[var(--muted)]">
          신청 마감, 본선 발표 등 중요한 날짜를 여러 개 추가할 수 있어요.
        </p>
        <ActionForm
          action={addMilestone}
          submitLabel="마일스톤 추가"
          successMessage="추가했습니다. 새로고침하세요."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">이름 *</label>
              <input name="label" required className="input" placeholder="예: 신청 마감" />
            </div>
            <div>
              <label className="label">날짜/시간 *</label>
              <input name="target_at" type="datetime-local" required className="input" />
            </div>
          </div>
        </ActionForm>

        {milestones && milestones.length > 0 && (
          <div className="mt-4 flex flex-col gap-2 border-t border-[var(--line)] pt-4">
            {milestones.map((m) => (
              <DeleteRow
                key={m.id}
                id={m.id}
                kind="milestone"
                left={m.label}
                right={formatDateTime(m.target_at)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 일정표 */}
      <div className="card mt-6">
        <h2 className="mb-1 font-bold">일정표</h2>
        <p className="mb-4 text-sm text-[var(--muted)]">
          몇월 몇일 몇시에 무엇을 하는지 추가하세요.
        </p>
        <ActionForm
          action={addScheduleItem}
          submitLabel="일정 추가"
          successMessage="추가했습니다. 새로고침하세요."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">날짜/시간 *</label>
              <input name="starts_at" type="datetime-local" required className="input" />
            </div>
            <div>
              <label className="label">내용 *</label>
              <input name="title" required className="input" placeholder="개회식 & 오리엔테이션" />
            </div>
          </div>
        </ActionForm>

        {items && items.length > 0 && (
          <div className="mt-4 flex flex-col gap-2 border-t border-[var(--line)] pt-4">
            {items.map((it) => (
              <DeleteRow
                key={it.id}
                id={it.id}
                kind="schedule"
                left={it.starts_at ? formatDateTime(it.starts_at) : (it.time_label ?? "—")}
                right={it.title}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
