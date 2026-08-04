// 채점 진행률 바 (심사·팀 평가 화면 상단). 남은 팀 수를 강조해 누락을 줄인다.
export function ScoreProgress({
  done,
  total,
  unit = "팀",
  label = "채점 완료",
}: {
  done: number;
  total: number;
  unit?: string;
  label?: string;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const allDone = total > 0 && done >= total;
  const left = Math.max(0, total - done);

  return (
    <div className="mt-4 rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-ink">
          {label} <span className="tabular-nums">{done}</span>
          <span className="font-normal text-[var(--muted)]">
            {" "}
            / {total}
            {unit}
          </span>
        </span>
        <span
          className={`text-sm font-bold tabular-nums ${
            allDone ? "text-team" : "text-vote"
          }`}
        >
          {allDone ? "모두 완료 🎉" : `${left}${unit} 남음`}
        </span>
      </div>
      <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            allDone ? "bg-team" : "bg-vote"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
