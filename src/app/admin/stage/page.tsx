import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StageControl } from "./StageControl";
import { AdminPageHeader } from "../AdminPageHeader";

export const dynamic = "force-dynamic";

export default async function AdminStagePage() {
  // 권한 검사는 admin/layout.tsx 가 처리한다.
  const supabase = await createClient();
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
    <div className="mx-auto max-w-2xl lg:mx-0">
      <AdminPageHeader
        title="발표 진행 제어"
        desc={
          <>
            현재 발표 팀을 지정하면 <b>/stage</b> 대형 화면에 실시간 반영됩니다.
            프로젝터에는 공개 화면을 띄우세요.
          </>
        }
        aside={
          <Link href="/stage" target="_blank" rel="noopener" className="btn-ghost">
            공개 화면 열기 ↗
          </Link>
        }
      />

      <StageControl
        projects={list}
        currentId={settings?.presenting_project_id ?? null}
      />
    </div>
  );
}
