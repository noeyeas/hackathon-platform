import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WeightControl } from "../WeightControl";

export const dynamic = "force-dynamic";

export default async function WeightsPage() {
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
    .select("weights")
    .single();
  const weights = settings?.weights ?? { judge: 0.5, team: 0.25, audience: 0.25 };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">점수 가중치</h1>
      <p className="mt-1 text-[var(--muted)]">
        심사·팀·관객 투표 반영 비율을 조정합니다. 합이 100%가 되어야 합니다.
      </p>
      <div className="card mt-6">
        <WeightControl weights={weights} />
      </div>
    </div>
  );
}
