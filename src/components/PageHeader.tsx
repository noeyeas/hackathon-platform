// 페이지 머리말 — 작은 라벨(eyebrow) + 명조 제목 + 설명, 오른쪽에 부가 영역.
// 모든 하위 페이지가 같은 리듬으로 시작하도록 여기 한 곳에서 관리한다.
export function PageHeader({
  eyebrow,
  title,
  desc,
  aside,
  className = "",
}: {
  eyebrow: string;
  title: React.ReactNode;
  desc?: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={`flex flex-wrap items-end justify-between gap-x-6 gap-y-4 ${className}`}
    >
      <div className="min-w-0">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="display mt-2 text-3xl leading-tight sm:text-[2.6rem]">
          {title}
        </h1>
        {desc && (
          <p className="mt-2 text-sm text-[var(--muted)] sm:text-[0.95rem]">
            {desc}
          </p>
        )}
      </div>
      {aside && <div className="flex shrink-0 items-center gap-2">{aside}</div>}
    </header>
  );
}
