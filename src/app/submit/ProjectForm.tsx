import { ActionForm } from "@/components/ActionForm";
import { saveProject } from "./actions";
import { PROJECT_TRACKS } from "@/lib/types";

type Project = {
  title: string | null;
  description: string | null;
  repo_url: string | null;
  demo_url: string | null;
  video_url: string | null;
  deck_url: string | null;
  track?: string | null;
  thumbnail_url?: string | null;
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

      <label className="label mt-4">주제</label>
      <select
        name="track"
        defaultValue={project?.track ?? ""}
        className="input"
      >
        <option value="">선택 안 함</option>
        {PROJECT_TRACKS.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
      <p className="mt-1.5 text-xs text-[var(--muted)]">
        갤러리에서 주제별로 묶어 보여줍니다. 나중에 바꿔도 됩니다.
      </p>

      <label className="label mt-4">한 줄 ~ 짧은 설명</label>
      <textarea
        name="description"
        rows={4}
        defaultValue={project?.description ?? ""}
        className="input"
        placeholder="무엇을 만들었고 어떤 문제를 해결하나요?"
      />

      <label className="label mt-4">예시 이미지</label>
      {project?.thumbnail_url && (
        // 업로드된 원본을 그대로 미리보기 — 지금 무엇이 걸려 있는지 확인용.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={project.thumbnail_url}
          alt="현재 등록된 예시 이미지"
          className="mb-2 aspect-[16/10] w-full max-w-xs rounded-lg border border-[var(--line)] object-cover"
        />
      )}
      <input
        name="thumbnail_file"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="input !py-2 file:mr-3 file:rounded-md file:border-0 file:bg-paper file:px-3 file:py-1.5 file:text-sm"
      />
      <p className="mt-1.5 text-xs text-[var(--muted)]">
        갤러리 카드의 썸네일로 쓰입니다. PNG·JPG·WEBP·GIF, 5MB 이하. 올리지
        않으면 제목 첫 글자가 대신 표시돼요.
      </p>
      {project?.thumbnail_url && (
        <label className="mt-2 flex items-center gap-2 text-sm text-[var(--muted)]">
          <input type="checkbox" name="thumbnail_remove" />
          등록된 예시 이미지 삭제
        </label>
      )}

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
