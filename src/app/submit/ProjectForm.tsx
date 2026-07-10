import { ActionForm } from "@/components/ActionForm";
import { saveProject } from "./actions";

type Project = {
  title: string | null;
  description: string | null;
  repo_url: string | null;
  demo_url: string | null;
  video_url: string | null;
  deck_url: string | null;
} | null;

// 프로젝트 제출/수정 폼 (제출 페이지·마이페이지 공용)
export function ProjectForm({ project }: { project: Project }) {
  return (
    <ActionForm
      action={saveProject}
      submitLabel={project ? "수정 저장" : "제출하기"}
    >
      <label className="label">프로젝트 제목 *</label>
      <input
        name="title"
        required
        defaultValue={project?.title ?? ""}
        className="input"
      />

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
          <label className="label">GitHub 저장소 *</label>
          <input
            name="repo_url"
            type="url"
            required
            defaultValue={project?.repo_url ?? ""}
            className="input"
            placeholder="https://github.com/..."
          />
        </div>
        <div>
          <label className="label">데모 링크</label>
          <input
            name="demo_url"
            type="url"
            defaultValue={project?.demo_url ?? ""}
            className="input"
            placeholder="https://..."
          />
        </div>
        <div>
          <label className="label">데모 영상</label>
          <input
            name="video_url"
            type="url"
            defaultValue={project?.video_url ?? ""}
            className="input"
            placeholder="https://youtu.be/..."
          />
        </div>
        <div>
          <label className="label">참고자료 링크</label>
          <input
            name="deck_url"
            type="url"
            defaultValue={project?.deck_url ?? ""}
            className="input"
            placeholder="구글 드라이브, Notion 등"
          />
          <p className="mt-1.5 text-xs text-[var(--muted)]">
            발표 자료·문서 링크를 걸어주세요. 외부에서 열람 가능하도록 공유
            설정을 꼭 확인하세요.
          </p>
        </div>
      </div>
    </ActionForm>
  );
}
