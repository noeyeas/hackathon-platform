import { ActionForm } from "@/components/ActionForm";
import { updateTeamInfo } from "./actions";

type Team = {
  name: string | null;
  tagline: string | null;
  members_note: string | null;
};

// 팀 소개·팀원 구성 수정 폼 (팀 페이지·마이페이지 공용). 팀 이름은 고정.
export function TeamInfoForm({ team }: { team: Team }) {
  return (
    <ActionForm
      action={updateTeamInfo}
      submitLabel="저장"
      successMessage="저장했습니다."
    >
      <label className="label">팀 이름</label>
      <input
        value={team.name ?? ""}
        disabled
        className="input bg-gray-50 text-[var(--muted)]"
      />
      <label className="label mt-3">한 줄 소개</label>
      <input
        name="tagline"
        defaultValue={team.tagline ?? ""}
        className="input"
        placeholder="우리 팀을 소개해 주세요"
      />
      <label className="label mt-3">팀원 구성 (선택)</label>
      <textarea
        name="members_note"
        rows={3}
        defaultValue={team.members_note ?? ""}
        className="input"
        placeholder="예: 김철수(기획), 이영희(프론트), 박민수(백엔드)"
      />
    </ActionForm>
  );
}
