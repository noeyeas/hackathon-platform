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
          <label className="label">참고자료 (PDF)</label>
          <input
            name="deck_file"
            type="file"
            accept="application/pdf"
            className="block w-full text-sm text-[var(--muted)] file:mr-3 file:rounded-lg file:border-0 file:bg-vote file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:brightness-95"
          />
          {project?.deck_url && (
            <p className="mt-1.5 text-xs text-[var(--muted)]">
              현재 파일:{" "}
              <a
                href={project.deck_url}
                target="_blank"
                rel="noreferrer"
                className="text-vote underline"
              >
                보기
              </a>
              {" · "}새 PDF를 올리면 교체됩니다
            </p>
          )}
        </div>
      </div>
    </ActionForm>
  );
}
