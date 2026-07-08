import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/ActionForm";
import { saveProject } from "./actions";

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
    .select("team_id")
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
        <ActionForm
          action={saveProject}
          submitLabel={project ? "수정 저장" : "제출하기"}
        >
          <label className="label">프로젝트 제목 *</label>
          <input name="title" required defaultValue={project?.title ?? ""} className="input" />

          <label className="label mt-4">한 줄 ~ 짧은 설명</label>
          <textarea
            name="description"
            rows={4}
            defaultValue={project?.description ?? ""}
            className="input"
            placeholder="무엇을 만들었고 어떤 문제를 해결하나요?"
          />

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">GitHub 저장소</label>
              <input name="repo_url" type="url" defaultValue={project?.repo_url ?? ""} className="input" placeholder="https://github.com/..." />
            </div>
            <div>
              <label className="label">데모 링크</label>
              <input name="demo_url" type="url" defaultValue={project?.demo_url ?? ""} className="input" placeholder="https://..." />
            </div>
            <div>
              <label className="label">데모 영상</label>
              <input name="video_url" type="url" defaultValue={project?.video_url ?? ""} className="input" placeholder="https://youtu.be/..." />
            </div>
            <div>
              <label className="label">발표자료</label>
              <input name="deck_url" type="url" defaultValue={project?.deck_url ?? ""} className="input" placeholder="https://..." />
            </div>
          </div>
        </ActionForm>
      </div>
    </div>
  );
}
