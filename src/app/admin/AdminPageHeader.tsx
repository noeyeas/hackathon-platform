// 운영 콘솔 안쪽 페이지의 머리말. 공개 페이지(PageHeader)보다 한 단계 작고
// 조밀하게 — 콘솔은 정보 밀도가 우선이다.
export function AdminPageHeader({
  title,
  desc,
  aside,
}: {
  title: string;
  desc?: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="font-title text-2xl font-bold text-ink">{title}</h1>
        {desc && (
          <p className="mt-1 text-sm text-[var(--muted)]">{desc}</p>
        )}
      </div>
      {aside && <div className="flex shrink-0 items-center gap-2">{aside}</div>}
    </header>
  );
}
