// 팀 이름 칩. 팀원 구성이 있으면 마우스를 올렸을 때 툴팁으로 보여준다.
// (CSS group-hover 기반 — 클라이언트 JS 불필요)
export function TeamName({
  name,
  membersNote,
  className = "",
  chipClassName = "chip",
}: {
  name: string;
  membersNote?: string | null;
  className?: string;
  chipClassName?: string;
}) {
  return (
    <span className={`group/team relative inline-flex w-fit ${className}`}>
      <span className={membersNote ? `${chipClassName} cursor-help` : chipClassName}>
        {name}
      </span>
      {membersNote && (
        <span
          role="tooltip"
          className="pointer-events-none absolute left-0 top-full z-30 mt-1.5 hidden w-max max-w-[240px] whitespace-pre-wrap rounded-lg bg-ink px-3 py-2 text-left text-xs leading-relaxed text-white shadow-lg group-hover/team:block"
        >
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-white/50">
            팀원 구성
          </span>
          {membersNote}
        </span>
      )}
    </span>
  );
}
