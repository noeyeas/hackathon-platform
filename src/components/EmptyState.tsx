// 목록이 비었을 때 보여주는 공통 빈 상태. 공지·갤러리·모집에서 같은 톤으로 사용.
export function EmptyState({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc?: string;
}) {
  return (
    <div className="card flex flex-col items-center gap-2 py-12 text-center">
      <span aria-hidden className="text-3xl">
        {icon}
      </span>
      <p className="font-medium text-ink">{title}</p>
      {desc && <p className="text-sm text-[var(--muted)]">{desc}</p>}
    </div>
  );
}
