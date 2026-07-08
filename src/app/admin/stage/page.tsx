import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StageControl } from "./StageControl";

export const dynamic = "force-dynamic";

export default async function AdminStagePage() {
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

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, present_order, submitted_at, teams(name)")
    .order("present_order", { ascending: true, nullsFirst: false })
    .order("submitted_at", { ascending: true });

  const { data: settings } = await supabase
    .from("event_settings")
    .select("presenting_project_id")
    .single();

  const list =
    projects?.map((p) => ({
      id: p.id,
      title: p.title,
      team: (p.teams as unknown as { name: string } | null)?.name ?? "",
    })) ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">발표 진행 제어</h1>
        <Link href="/stage" target="_blank" className="btn-ghost">
          공개 화면 열기 ↗
        </Link>
      </div>
      <p className="mt-1 text-[var(--muted)]">
        현재 발표 팀을 지정하면 <b>/stage</b> 대형 화면에 실시간 반영됩니다.
        프로젝터에는 공개 화면을 띄우세요.
      </p>

      <StageControl
        projects={list}
        currentId={settings?.presenting_project_id ?? null}
      />
    </div>
  );
}
