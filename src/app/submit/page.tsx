import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProjectForm } from "./ProjectForm";

export default async function SubmitPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="card mx-auto max-w-md text-center">
        <h1 className="text-xl font-bold">로그인이 필요합니다</h1>
        <Link href="/login" className="btn-primary mt-4 inline-flex">
          로그인
        </Link>
      </div>
    );
  }

  const { data: membership } = await supabase
    .from("team_members")
    .select("team_id, is_leader")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return (
      <div className="card mx-auto max-w-md text-center">
        <h1 className="text-xl font-bold">먼저 팀을 만들어 주세요</h1>
        <Link href="/team" className="btn-primary mt-4 inline-flex">
          팀 페이지로
        </Link>
      </div>
    );
  }

  if (!membership.is_leader) {
    return (
      <div className="card mx-auto max-w-md text-center">
        <h1 className="text-xl font-bold">제출은 팀장이 진행합니다</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          프로젝트 제출은 팀을 대표하는 팀장 계정에서만 할 수 있어요.
        </p>
      </div>
    );
  }

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("team_id", membership.team_id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">프로젝트 제출</h1>
      <p className="mt-1 text-[var(--muted)]">
        마감 전까지 언제든 수정할 수 있습니다. 팀당 1개 제출됩니다.
      </p>

      <div className="card mt-6">
        <ProjectForm project={project} />
      </div>
    </div>
  );
}
