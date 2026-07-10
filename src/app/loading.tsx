// 페이지 전환 시 즉시 표시되는 스켈레톤.
// 서버 렌더가 끝날 때까지 화면이 멈춘 것처럼 보이던 문제를 없앤다.
export default function Loading() {
  return (
    <div className="flex animate-pulse flex-col gap-6" aria-hidden>
      <div className="h-8 w-1/3 rounded-lg bg-[var(--line)]" />
      <div className="h-4 w-2/3 rounded bg-[var(--line)]" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] p-5"
          >
            <div className="h-5 w-1/2 rounded bg-[var(--line)]" />
            <div className="h-4 w-full rounded bg-[var(--line)]" />
            <div className="h-4 w-4/5 rounded bg-[var(--line)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
