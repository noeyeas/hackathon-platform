import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/ActionForm";
import { addMilestone } from "./actions";
import { MilestoneAdminRow } from "./MilestoneAdminRow";

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
    .select("id, label, target_at, place, sort")
    .order("target_at", { ascending: true });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">홈 타임라인 관리</h1>
      <p className="mt-1 text-[var(--muted)]">
        여기서 추가·수정한 단계가 <b>홈 히어로 타임라인</b>에 날짜순으로 그대로
        표시됩니다. 가장 가까운 다음 단계에 D-day가 자동으로 붙어요.
      </p>

      <div className="card mt-6">
        <h2 className="mb-1 font-bold">단계 추가</h2>
        <p className="mb-4 text-sm text-[var(--muted)]">
          신청 마감·해커톤 시작·최종 발표 등 주요 시점을 추가하세요. 장소는
          선택이며, 입력하면 해당 노드 아래에 📍로 표시됩니다.
        </p>
        <ActionForm
          action={addMilestone}
          submitLabel="단계 추가"
          successMessage="추가했습니다."
          resetOnSuccess
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">이름 *</label>
              <input
                name="label"
                required
                className="input"
                placeholder="예: 최종 발표"
              />
            </div>
            <div>
              <label className="label">날짜/시간 *</label>
              <input
                name="target_at"
                type="datetime-local"
                required
                className="input"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">장소 (선택)</label>
              <input
                name="place"
                className="input"
                placeholder="예: 광운대 기념관 319호"
              />
            </div>
          </div>
        </ActionForm>

        {milestones && milestones.length > 0 && (
          <div className="mt-4 flex flex-col gap-2 border-t border-[var(--line)] pt-4">
            {milestones.map((m) => (
              <MilestoneAdminRow
                key={m.id}
                id={m.id}
                label={m.label}
                targetAt={m.target_at}
                place={m.place}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
