// 일정이 있는 달들을 미니 달력으로 보여주고, 일정 있는 날을 표시.
// 서버 컴포넌트 — 한국시간(Asia/Seoul) 기준으로 날짜 계산.

type Item = { starts_at: string | null; title: string };

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

function seoulYMD(d: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

function Month({
  y,
  m,
  events,
  today,
}: {
  y: number;
  m: number; // 1~12
  events: Map<number, string[]>; // 일(day) -> 제목들
  today: { y: number; m: number; d: number };
}) {
  const firstWeekday = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      <p className="mb-2 text-center text-sm font-bold">
        {y}년 {m}월
      </p>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {WEEK.map((w, i) => (
          <span
            key={w}
            className={`py-1 font-semibold ${
              i === 0
                ? "text-red-400"
                : i === 6
                  ? "text-blue-400"
                  : "text-[var(--muted)]"
            }`}
          >
            {w}
          </span>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <span key={`b${i}`} />;
          const has = events.has(d);
          const isToday = today.y === y && today.m === m && today.d === d;
          return (
            <div
              key={d}
              title={has ? events.get(d)!.join(", ") : undefined}
              className={`flex aspect-square items-center justify-center rounded-full text-sm ${
                has
                  ? "bg-vote font-bold text-white"
                  : isToday
                    ? "font-bold text-vote ring-1 ring-vote"
                    : "text-ink"
              }`}
            >
              {d}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ScheduleCalendar({ items }: { items: Item[] }) {
  const dated = items.filter((it) => it.starts_at);
  if (!dated.length) return null;

  // 월(月)별로 묶고, 각 월의 (일 -> 제목들) 맵 생성
  const months = new Map<string, { y: number; m: number; events: Map<number, string[]> }>();
  for (const it of dated) {
    const { y, m, d } = seoulYMD(new Date(it.starts_at!));
    const key = `${y}-${m}`;
    if (!months.has(key)) months.set(key, { y, m, events: new Map() });
    const bucket = months.get(key)!.events;
    bucket.set(d, [...(bucket.get(d) ?? []), it.title]);
  }

  const sorted = [...months.values()].sort(
    (a, b) => a.y - b.y || a.m - b.m
  );
  const today = seoulYMD(new Date());

  return (
    <div className="card flex flex-col gap-6">
      {sorted.map((mo) => (
        <Month
          key={`${mo.y}-${mo.m}`}
          y={mo.y}
          m={mo.m}
          events={mo.events}
          today={today}
        />
      ))}
      <div className="flex items-center gap-2 border-t border-[var(--line)] pt-3 text-xs text-[var(--muted)]">
        <span className="inline-block h-3 w-3 rounded-full bg-vote" />
        일정 있는 날
      </div>
    </div>
  );
}
