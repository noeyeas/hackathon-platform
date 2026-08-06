import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProjectForm } from "./ProjectForm";
import { PageHeader } from "@/components/PageHeader";
import { canSubmitProject } from "@/lib/submitWindow";
import { formatDateTime } from "@/lib/format";

export default async function SubmitPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="card mx-auto max-w-md text-center">
        <h1 className="display text-xl">로그인이 필요합니다</h1>
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
        <h1 className="display text-xl">먼저 팀을 만들어 주세요</h1>
        <Link href="/team" className="btn-primary mt-4 inline-flex">
          팀 페이지로
        </Link>
      </div>
    );
  }

  if (!membership.is_leader) {
    return (
      <div className="card mx-auto max-w-md text-center">
        <h1 className="display text-xl">제출은 팀장이 진행합니다</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          프로젝트 제출은 팀을 대표하는 팀장 계정에서만 할 수 있어요.
        </p>
      </div>
    );
  }

  const [{ data: project }, { data: settings }] = await Promise.all([
    supabase
      .from("projects")
      // select("*") 는 쓰지 않는다 — 0035 에서 주민 득표수 컬럼 권한을
      // 회수하므로, * 로 읽으면 권한 없는 컬럼까지 요청해 실패한다.
      .select(
        "id, title, description, track, repo_url, demo_url, video_url, deck_url"
      )
      .eq("team_id", membership.team_id)
      .maybeSingle(),
    supabase.from("event_settings").select("submit_deadline").single(),
  ]);

  const deadline = settings?.submit_deadline ?? null;
  const canSubmit = canSubmitProject(deadline);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Submit"
        title="프로젝트 제출"
        desc={
          deadline
            ? `${formatDateTime(deadline)} 마감까지 언제든 수정할 수 있습니다. 팀당 1개 제출됩니다.`
            : "마감 전까지 언제든 수정할 수 있습니다. 팀당 1개 제출됩니다."
        }
      />

      <div className="card mt-8">
        {canSubmit ? (
          <ProjectForm project={project} />
        ) : (
          <ClosedNotice project={project} />
        )}
      </div>
    </div>
  );
}

// 마감 후 화면 — 제출한 내용은 그대로 확인할 수 있게 남긴다.
function ClosedNotice({
  project,
}: {
  project: { title: string | null; repo_url: string | null } | null;
}) {
  return (
    <div className="text-center">
      <h2 className="display text-lg">제출이 마감되었습니다</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">
        {project
          ? "제출된 내용으로 심사가 진행됩니다. 수정이 꼭 필요하면 운영진에게 문의해 주세요."
          : "마감 시각이 지나 더 이상 제출할 수 없습니다. 운영진에게 문의해 주세요."}
      </p>
      {project && (
        <div className="mt-4 rounded-md bg-[var(--surface-2,#f5f5f4)] px-4 py-3 text-left text-sm">
          <p className="font-semibold">{project.title}</p>
          {project.repo_url && (
            <p className="mt-1 break-all text-[var(--muted)]">
              {project.repo_url}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
